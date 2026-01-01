"""
Database Adapter - MongoDB-like interface for Supabase
Provides MongoDB-style operations using Supabase PostgreSQL
"""
from typing import Dict, List, Optional, Any
from supabase import Client
from datetime import datetime, timezone
import json


class SupabaseCollection:
    """MongoDB-like collection interface for Supabase tables"""

    def __init__(self, client: Client, table_name: str):
        self.client = client
        self.table_name = table_name

    async def find_one(self, query: Dict, projection: Optional[Dict] = None) -> Optional[Dict]:
        """Find single document matching query"""
        try:
            select_query = self.client.table(self.table_name).select("*")

            # Apply filters
            for key, value in query.items():
                if isinstance(value, dict):
                    # Handle special operators like $in, $gte, etc.
                    for op, op_value in value.items():
                        if op == "$in":
                            select_query = select_query.in_(key, op_value)
                        elif op == "$gte":
                            select_query = select_query.gte(key, op_value)
                        elif op == "$lte":
                            select_query = select_query.lte(key, op_value)
                        elif op == "$ne":
                            select_query = select_query.neq(key, op_value)
                else:
                    select_query = select_query.eq(key, value)

            result = select_query.limit(1).execute()

            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
        except Exception as e:
            print(f"Error in find_one: {e}")
            return None

    async def find(self, query: Optional[Dict] = None, projection: Optional[Dict] = None,
                   sort: Optional[List] = None, limit: Optional[int] = None) -> List[Dict]:
        """Find multiple documents matching query"""
        try:
            select_query = self.client.table(self.table_name).select("*")

            # Apply filters
            if query:
                for key, value in query.items():
                    if isinstance(value, dict):
                        for op, op_value in value.items():
                            if op == "$in":
                                select_query = select_query.in_(key, op_value)
                            elif op == "$gte":
                                select_query = select_query.gte(key, op_value)
                            elif op == "$lte":
                                select_query = select_query.lte(key, op_value)
                            elif op == "$ne":
                                select_query = select_query.neq(key, op_value)
                            elif op == "$gt":
                                select_query = select_query.gt(key, op_value)
                            elif op == "$lt":
                                select_query = select_query.lt(key, op_value)
                    else:
                        select_query = select_query.eq(key, value)

            # Apply sorting
            if sort:
                for field, direction in sort:
                    if direction == -1:
                        select_query = select_query.order(field, desc=True)
                    else:
                        select_query = select_query.order(field, desc=False)

            # Apply limit
            if limit:
                select_query = select_query.limit(limit)

            result = select_query.execute()
            return result.data if result.data else []
        except Exception as e:
            print(f"Error in find: {e}")
            return []

    async def insert_one(self, document: Dict) -> Dict:
        """Insert a single document"""
        try:
            # Convert datetime objects to ISO format strings
            doc = self._serialize_dates(document)
            result = self.client.table(self.table_name).insert(doc).execute()
            return {"acknowledged": True, "inserted_id": result.data[0] if result.data else None}
        except Exception as e:
            print(f"Error in insert_one: {e}")
            raise

    async def insert_many(self, documents: List[Dict]) -> Dict:
        """Insert multiple documents"""
        try:
            docs = [self._serialize_dates(doc) for doc in documents]
            result = self.client.table(self.table_name).insert(docs).execute()
            return {"acknowledged": True, "inserted_ids": result.data}
        except Exception as e:
            print(f"Error in insert_many: {e}")
            raise

    async def update_one(self, query: Dict, update: Dict) -> Dict:
        """Update a single document"""
        try:
            # Extract $set operation
            update_data = update.get("$set", {})
            update_data = self._serialize_dates(update_data)

            # Handle $inc operation
            if "$inc" in update:
                inc_data = update["$inc"]
                for key, value in inc_data.items():
                    update_data[key] = value

            # Build update query
            update_query = self.client.table(self.table_name).update(update_data)

            # Apply filters
            for key, value in query.items():
                update_query = update_query.eq(key, value)

            result = update_query.execute()
            return {"acknowledged": True, "modified_count": len(result.data) if result.data else 0}
        except Exception as e:
            print(f"Error in update_one: {e}")
            raise

    async def update_many(self, query: Dict, update: Dict) -> Dict:
        """Update multiple documents"""
        return await self.update_one(query, update)

    async def delete_one(self, query: Dict) -> Dict:
        """Delete a single document"""
        try:
            delete_query = self.client.table(self.table_name).delete()

            # Apply filters
            for key, value in query.items():
                delete_query = delete_query.eq(key, value)

            result = delete_query.execute()
            return {"acknowledged": True, "deleted_count": len(result.data) if result.data else 0}
        except Exception as e:
            print(f"Error in delete_one: {e}")
            raise

    async def delete_many(self, query: Dict) -> Dict:
        """Delete multiple documents"""
        return await self.delete_one(query)

    async def count_documents(self, query: Optional[Dict] = None) -> int:
        """Count documents matching query"""
        try:
            select_query = self.client.table(self.table_name).select("*", count="exact")

            if query:
                for key, value in query.items():
                    select_query = select_query.eq(key, value)

            result = select_query.execute()
            return result.count if hasattr(result, 'count') else 0
        except Exception as e:
            print(f"Error in count_documents: {e}")
            return 0

    async def aggregate(self, pipeline: List[Dict]) -> List[Dict]:
        """Aggregation pipeline (simplified version)"""
        # This is a simplified implementation
        # For complex aggregations, use direct SQL queries
        return []

    async def create_index(self, keys, unique: bool = False):
        """Create index (no-op for Supabase, indexes created in migrations)"""
        pass

    def _serialize_dates(self, doc: Dict) -> Dict:
        """Convert datetime objects to ISO format strings"""
        result = {}
        for key, value in doc.items():
            if isinstance(value, datetime):
                result[key] = value.isoformat()
            elif isinstance(value, dict):
                result[key] = self._serialize_dates(value)
            elif isinstance(value, list):
                result[key] = [
                    self._serialize_dates(item) if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                result[key] = value
        return result


class SupabaseDatabase:
    """MongoDB-like database interface for Supabase"""

    def __init__(self, client: Client):
        self.client = client
        self._collections = {}

    def __getitem__(self, collection_name: str) -> SupabaseCollection:
        """Get collection by name"""
        if collection_name not in self._collections:
            self._collections[collection_name] = SupabaseCollection(self.client, collection_name)
        return self._collections[collection_name]

    def __getattr__(self, collection_name: str) -> SupabaseCollection:
        """Get collection by attribute access"""
        return self[collection_name]
