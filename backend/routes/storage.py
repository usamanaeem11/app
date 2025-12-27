from fastapi import APIRouter, HTTPException, Depends, Request, UploadFile, File
from pydantic import BaseModel
from typing import Optional
import os
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
import base64
import uuid
from datetime import datetime, timezone
import logging

router = APIRouter(prefix="/storage", tags=["storage"])
logger = logging.getLogger(__name__)

# S3-compatible storage configuration (works with Contabo Object Storage, MinIO, AWS S3, etc.)
def get_s3_client():
    """Initialize S3-compatible client for Contabo or other providers"""
    endpoint_url = os.environ.get('S3_ENDPOINT_URL')  # e.g., https://eu2.contabostorage.com
    access_key = os.environ.get('S3_ACCESS_KEY')
    secret_key = os.environ.get('S3_SECRET_KEY')
    region = os.environ.get('S3_REGION', 'eu2')
    
    if not all([endpoint_url, access_key, secret_key]):
        return None
    
    return boto3.client(
        's3',
        endpoint_url=endpoint_url,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=region,
        config=Config(
            signature_version='s3v4',
            s3={'addressing_style': 'path'}
        )
    )

def get_bucket_name():
    return os.environ.get('S3_BUCKET_NAME', 'workmonitor-screenshots')

class ScreenshotUploadRequest(BaseModel):
    time_entry_id: str
    image_data: str  # Base64 encoded image
    taken_at: str
    app_name: Optional[str] = None
    window_title: Optional[str] = None
    blurred: bool = False

class PresignedUrlRequest(BaseModel):
    file_key: str
    expires_in: int = 3600  # 1 hour default

@router.post("/upload-screenshot")
async def upload_screenshot(
    data: ScreenshotUploadRequest,
    request: Request
):
    """Upload a screenshot to S3-compatible storage"""
    db = request.app.state.db
    s3_client = get_s3_client()
    bucket_name = get_bucket_name()
    
    # Generate unique file key
    screenshot_id = f"ss_{uuid.uuid4().hex[:12]}"
    file_key = f"screenshots/{datetime.now().strftime('%Y/%m/%d')}/{screenshot_id}.png"
    
    try:
        # Decode base64 image
        image_bytes = base64.b64decode(data.image_data)
        
        if s3_client:
            # Upload to S3-compatible storage
            s3_client.put_object(
                Bucket=bucket_name,
                Key=file_key,
                Body=image_bytes,
                ContentType='image/png',
                Metadata={
                    'time_entry_id': data.time_entry_id,
                    'taken_at': data.taken_at,
                    'app_name': data.app_name or '',
                    'blurred': str(data.blurred)
                }
            )
            
            # Generate presigned URL for viewing
            url = s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': bucket_name, 'Key': file_key},
                ExpiresIn=86400  # 24 hours
            )
        else:
            # Fallback: Store reference without actual upload (for development)
            url = f"/api/storage/screenshots/{screenshot_id}"
            logger.warning("S3 not configured - screenshot stored as reference only")
        
        # Save metadata to database
        screenshot_doc = {
            "screenshot_id": screenshot_id,
            "time_entry_id": data.time_entry_id,
            "s3_key": file_key,
            "s3_url": url,
            "taken_at": data.taken_at,
            "app_name": data.app_name,
            "window_title": data.window_title,
            "blurred": data.blurred,
            "file_size": len(image_bytes),
            "storage_type": "s3" if s3_client else "reference",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.screenshots.insert_one(screenshot_doc)
        
        return {
            "screenshot_id": screenshot_id,
            "url": url,
            "file_key": file_key,
            "storage_type": screenshot_doc["storage_type"]
        }
        
    except Exception as e:
        logger.error(f"Screenshot upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload screenshot: {str(e)}")

@router.post("/presigned-url")
async def get_presigned_url(data: PresignedUrlRequest):
    """Get a presigned URL for accessing a file"""
    s3_client = get_s3_client()
    bucket_name = get_bucket_name()
    
    if not s3_client:
        raise HTTPException(status_code=503, detail="Storage not configured")
    
    try:
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket_name, 'Key': data.file_key},
            ExpiresIn=data.expires_in
        )
        return {"url": url, "expires_in": data.expires_in}
    except ClientError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/presigned-upload-url")
async def get_presigned_upload_url(
    filename: str,
    content_type: str = "image/png"
):
    """Get a presigned URL for direct upload from client"""
    s3_client = get_s3_client()
    bucket_name = get_bucket_name()
    
    if not s3_client:
        raise HTTPException(status_code=503, detail="Storage not configured")
    
    # Generate unique file key
    file_key = f"uploads/{datetime.now().strftime('%Y/%m/%d')}/{uuid.uuid4().hex[:12]}_{filename}"
    
    try:
        url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': bucket_name,
                'Key': file_key,
                'ContentType': content_type
            },
            ExpiresIn=3600  # 1 hour to upload
        )
        return {
            "upload_url": url,
            "file_key": file_key,
            "expires_in": 3600
        }
    except ClientError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/screenshot/{screenshot_id}")
async def delete_screenshot(
    screenshot_id: str,
    request: Request
):
    """Delete a screenshot from storage"""
    db = request.app.state.db
    s3_client = get_s3_client()
    bucket_name = get_bucket_name()
    
    # Get screenshot from database
    screenshot = await db.screenshots.find_one({"screenshot_id": screenshot_id})
    if not screenshot:
        raise HTTPException(status_code=404, detail="Screenshot not found")
    
    try:
        # Delete from S3 if configured
        if s3_client and screenshot.get("storage_type") == "s3":
            s3_client.delete_object(
                Bucket=bucket_name,
                Key=screenshot["s3_key"]
            )
        
        # Delete from database
        await db.screenshots.delete_one({"screenshot_id": screenshot_id})
        
        return {"status": "deleted", "screenshot_id": screenshot_id}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete screenshot: {str(e)}")

@router.get("/storage-status")
async def get_storage_status():
    """Check if S3 storage is configured and accessible"""
    s3_client = get_s3_client()
    bucket_name = get_bucket_name()
    
    if not s3_client:
        return {
            "configured": False,
            "message": "S3 storage not configured. Set S3_ENDPOINT_URL, S3_ACCESS_KEY, S3_SECRET_KEY environment variables."
        }
    
    try:
        # Try to list bucket contents
        s3_client.head_bucket(Bucket=bucket_name)
        return {
            "configured": True,
            "accessible": True,
            "bucket": bucket_name,
            "endpoint": os.environ.get('S3_ENDPOINT_URL')
        }
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        return {
            "configured": True,
            "accessible": False,
            "error": error_code,
            "message": f"Cannot access bucket: {error_code}"
        }
