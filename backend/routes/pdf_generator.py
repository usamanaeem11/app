from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel
from typing import List, Optional
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
import base64
from datetime import datetime
import logging

router = APIRouter(prefix="/pdf", tags=["pdf"])
logger = logging.getLogger(__name__)

class InvoiceItem(BaseModel):
    description: str
    quantity: float
    unit_price: float
    total: float

class InvoicePDFRequest(BaseModel):
    invoice_number: str
    invoice_date: str
    due_date: str
    company_name: str
    company_address: Optional[str] = ""
    company_email: Optional[str] = ""
    client_name: str
    client_address: Optional[str] = ""
    client_email: Optional[str] = ""
    items: List[InvoiceItem]
    subtotal: float
    tax_rate: float
    tax_amount: float
    total: float
    notes: Optional[str] = ""
    currency: str = "USD"

class TimesheetPDFRequest(BaseModel):
    user_name: str
    week_start: str
    week_end: str
    entries: List[dict]  # [{date, project, hours, description}]
    total_hours: float
    company_name: str

def generate_invoice_pdf(data: InvoicePDFRequest) -> bytes:
    """Generate a professional invoice PDF"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=50, leftMargin=50, topMargin=50, bottomMargin=50)
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        fontSize=28,
        textColor=colors.HexColor('#10b981'),
        spaceAfter=20
    )
    heading_style = ParagraphStyle(
        'Heading',
        parent=styles['Heading2'],
        fontSize=12,
        textColor=colors.HexColor('#71717a'),
        spaceAfter=5
    )
    normal_style = ParagraphStyle(
        'Normal',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#27272a')
    )
    
    elements = []
    
    # Header
    elements.append(Paragraph("INVOICE", title_style))
    elements.append(Spacer(1, 10))
    
    # Invoice details and Company info side by side
    header_data = [
        [
            Paragraph(f"<b>{data.company_name}</b>", normal_style),
            Paragraph(f"<b>Invoice #:</b> {data.invoice_number}", normal_style)
        ],
        [
            Paragraph(data.company_address.replace('\n', '<br/>'), normal_style) if data.company_address else "",
            Paragraph(f"<b>Date:</b> {data.invoice_date}", normal_style)
        ],
        [
            Paragraph(data.company_email, normal_style) if data.company_email else "",
            Paragraph(f"<b>Due Date:</b> {data.due_date}", normal_style)
        ]
    ]
    
    header_table = Table(header_data, colWidths=[3.5*inch, 3*inch])
    header_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 30))
    
    # Bill To
    elements.append(Paragraph("BILL TO", heading_style))
    elements.append(Paragraph(f"<b>{data.client_name}</b>", normal_style))
    if data.client_address:
        elements.append(Paragraph(data.client_address.replace('\n', '<br/>'), normal_style))
    if data.client_email:
        elements.append(Paragraph(data.client_email, normal_style))
    elements.append(Spacer(1, 20))
    
    # Items table
    currency_symbol = "$" if data.currency == "USD" else data.currency
    
    items_data = [['Description', 'Qty', 'Unit Price', 'Total']]
    for item in data.items:
        items_data.append([
            item.description,
            f"{item.quantity:.2f}",
            f"{currency_symbol}{item.unit_price:.2f}",
            f"{currency_symbol}{item.total:.2f}"
        ])
    
    items_table = Table(items_data, colWidths=[3.5*inch, 1*inch, 1.25*inch, 1.25*inch])
    items_table.setStyle(TableStyle([
        # Header
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#10b981')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        # Body
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        # Grid
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e4e4e7')),
        ('LINEBELOW', (0, 0), (-1, 0), 2, colors.HexColor('#10b981')),
        # Alternating rows
        *[('BACKGROUND', (0, i), (-1, i), colors.HexColor('#fafafa')) for i in range(2, len(items_data), 2)]
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 20))
    
    # Totals
    totals_data = [
        ['', '', 'Subtotal:', f"{currency_symbol}{data.subtotal:.2f}"],
        ['', '', f"Tax ({data.tax_rate}%):", f"{currency_symbol}{data.tax_amount:.2f}"],
        ['', '', 'TOTAL:', f"{currency_symbol}{data.total:.2f}"]
    ]
    
    totals_table = Table(totals_data, colWidths=[3.5*inch, 1*inch, 1.25*inch, 1.25*inch])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (2, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (2, -1), (-1, -1), 12),
        ('TEXTCOLOR', (2, -1), (-1, -1), colors.HexColor('#10b981')),
        ('LINEABOVE', (2, -1), (-1, -1), 2, colors.HexColor('#10b981')),
        ('TOPPADDING', (0, -1), (-1, -1), 10),
    ]))
    elements.append(totals_table)
    
    # Notes
    if data.notes:
        elements.append(Spacer(1, 30))
        elements.append(Paragraph("NOTES", heading_style))
        elements.append(Paragraph(data.notes, normal_style))
    
    # Footer
    elements.append(Spacer(1, 40))
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#a1a1aa'),
        alignment=TA_CENTER
    )
    elements.append(Paragraph("Thank you for your business!", footer_style))
    elements.append(Paragraph(f"Generated by WorkMonitor • {datetime.now().strftime('%Y-%m-%d %H:%M')}", footer_style))
    
    doc.build(elements)
    return buffer.getvalue()

def generate_timesheet_pdf(data: TimesheetPDFRequest) -> bytes:
    """Generate a timesheet PDF"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=50, leftMargin=50, topMargin=50, bottomMargin=50)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=24, textColor=colors.HexColor('#10b981'))
    heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], fontSize=12, textColor=colors.HexColor('#71717a'))
    normal_style = ParagraphStyle('Normal', parent=styles['Normal'], fontSize=10)
    
    elements = []
    
    # Header
    elements.append(Paragraph("TIMESHEET", title_style))
    elements.append(Spacer(1, 10))
    elements.append(Paragraph(f"<b>{data.company_name}</b>", normal_style))
    elements.append(Spacer(1, 20))
    
    # Employee info
    info_data = [
        ['Employee:', data.user_name],
        ['Period:', f"{data.week_start} to {data.week_end}"],
        ['Total Hours:', f"{data.total_hours:.2f}"]
    ]
    info_table = Table(info_data, colWidths=[1.5*inch, 4*inch])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 20))
    
    # Time entries
    entries_data = [['Date', 'Project', 'Hours', 'Description']]
    for entry in data.entries:
        entries_data.append([
            entry.get('date', ''),
            entry.get('project', '-'),
            f"{entry.get('hours', 0):.2f}",
            entry.get('description', '')[:50]
        ])
    
    entries_table = Table(entries_data, colWidths=[1.25*inch, 1.5*inch, 0.75*inch, 3*inch])
    entries_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#10b981')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e4e4e7')),
        ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
    ]))
    elements.append(entries_table)
    
    doc.build(elements)
    return buffer.getvalue()

@router.post("/invoice")
async def generate_invoice(data: InvoicePDFRequest):
    """Generate an invoice PDF and return as base64"""
    try:
        pdf_bytes = generate_invoice_pdf(data)
        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
        
        return {
            "pdf_base64": pdf_base64,
            "filename": f"invoice_{data.invoice_number}.pdf",
            "size_bytes": len(pdf_bytes)
        }
    except Exception as e:
        logger.error(f"PDF generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")

@router.post("/invoice/download")
async def download_invoice(data: InvoicePDFRequest):
    """Generate and download an invoice PDF"""
    try:
        pdf_bytes = generate_invoice_pdf(data)
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=invoice_{data.invoice_number}.pdf"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")

@router.post("/timesheet")
async def generate_timesheet(data: TimesheetPDFRequest):
    """Generate a timesheet PDF and return as base64"""
    try:
        pdf_bytes = generate_timesheet_pdf(data)
        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
        
        return {
            "pdf_base64": pdf_base64,
            "filename": f"timesheet_{data.user_name}_{data.week_start}.pdf",
            "size_bytes": len(pdf_bytes)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")

@router.post("/timesheet/download")
async def download_timesheet(data: TimesheetPDFRequest):
    """Generate and download a timesheet PDF"""
    try:
        pdf_bytes = generate_timesheet_pdf(data)
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=timesheet_{data.user_name}_{data.week_start}.pdf"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")
