"""
Screen Recording Scheduler
Manages automatic screen recording for Business plan users with random intervals
"""
import asyncio
import random
from datetime import datetime, timezone
from typing import Dict
import logging

logger = logging.getLogger(__name__)


class ScreenRecordingScheduler:
    """Manages automatic 30-second screen recording for Business plan users"""

    def __init__(self):
        self.active_recorders: Dict[str, Dict] = {}  # entry_id -> recorder_info
        self.tasks: Dict[str, asyncio.Task] = {}  # entry_id -> async task
        self.recording_callback = None

    def set_recording_callback(self, callback):
        """Set the callback function to start screen recording"""
        self.recording_callback = callback

    async def start_recorder(self, entry_id: str, user_id: str, company_id: str):
        """
        Start automatic screen recording for a time entry (Business plan only)

        Args:
            entry_id: Time entry ID
            user_id: User ID
            company_id: Company ID
        """
        if entry_id in self.active_recorders:
            logger.info(f"Recorder already running for entry {entry_id}")
            return

        self.active_recorders[entry_id] = {
            "user_id": user_id,
            "company_id": company_id,
            "started_at": datetime.now(timezone.utc)
        }

        # Start the screen recording task
        task = asyncio.create_task(self._recording_loop(entry_id, user_id, company_id))
        self.tasks[entry_id] = task

        logger.info(f"Started screen recording for entry {entry_id}")

    async def stop_recorder(self, entry_id: str):
        """Stop screen recording for a time entry"""
        if entry_id not in self.active_recorders:
            logger.warning(f"No active recorder for entry {entry_id}")
            return

        # Cancel the async task
        if entry_id in self.tasks:
            self.tasks[entry_id].cancel()
            try:
                await self.tasks[entry_id]
            except asyncio.CancelledError:
                pass
            del self.tasks[entry_id]

        del self.active_recorders[entry_id]
        logger.info(f"Stopped screen recording for entry {entry_id}")

    async def _recording_loop(self, entry_id: str, user_id: str, company_id: str):
        """Background task to record screen at random intervals (1min - 15min)"""
        try:
            while entry_id in self.active_recorders:
                # Generate random interval between 1 minute (60s) and 15 minutes (900s)
                random_interval = random.randint(60, 900)
                logger.info(f"Next 30s screen recording for entry {entry_id} in {random_interval}s")

                # Wait for the random interval
                await asyncio.sleep(random_interval)

                # Check if recorder is still active
                if entry_id not in self.active_recorders:
                    break

                # Trigger 30-second screen recording
                if self.recording_callback:
                    try:
                        await self.recording_callback(entry_id, user_id, company_id, duration=30)
                        logger.info(f"30s screen recording started for entry {entry_id} after {random_interval}s wait")
                    except Exception as e:
                        logger.error(f"Error starting screen recording for entry {entry_id}: {e}")

        except asyncio.CancelledError:
            logger.info(f"Recording loop cancelled for entry {entry_id}")
        except Exception as e:
            logger.error(f"Error in recording loop for entry {entry_id}: {e}")

    def get_active_recorders(self) -> Dict[str, Dict]:
        """Get all active recorders"""
        return self.active_recorders.copy()

    def is_recorder_active(self, entry_id: str) -> bool:
        """Check if a recorder is active for an entry"""
        return entry_id in self.active_recorders

    async def stop_all_recorders(self):
        """Stop all active recorders"""
        entry_ids = list(self.active_recorders.keys())
        for entry_id in entry_ids:
            await self.stop_recorder(entry_id)
        logger.info("All screen recorders stopped")


# Global scheduler instance
screen_recording_scheduler = ScreenRecordingScheduler()
