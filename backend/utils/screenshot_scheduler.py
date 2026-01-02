"""
Screenshot Scheduler
Manages automatic screenshot capture for active time entries with random intervals
"""
import asyncio
import random
from datetime import datetime, timezone
from typing import Dict, Set
import logging

logger = logging.getLogger(__name__)


class ScreenshotScheduler:
    """Manages automatic screenshot capture for active time tracking sessions"""

    def __init__(self):
        self.active_timers: Dict[str, Dict] = {}  # entry_id -> timer_info
        self.tasks: Dict[str, asyncio.Task] = {}  # entry_id -> async task
        self.screenshot_callback = None

    def set_screenshot_callback(self, callback):
        """Set the callback function to capture screenshots"""
        self.screenshot_callback = callback

    async def start_timer(self, entry_id: str, user_id: str, company_id: str, interval: int = 600):
        """
        Start automatic screenshot capture for a time entry

        Args:
            entry_id: Time entry ID
            user_id: User ID
            company_id: Company ID
            interval: Screenshot interval in seconds (default 600 = 10 minutes)
        """
        if entry_id in self.active_timers:
            logger.info(f"Timer already running for entry {entry_id}")
            return

        self.active_timers[entry_id] = {
            "user_id": user_id,
            "company_id": company_id,
            "interval": interval,
            "started_at": datetime.now(timezone.utc)
        }

        # Start the screenshot capture task
        task = asyncio.create_task(self._screenshot_loop(entry_id, user_id, company_id, interval))
        self.tasks[entry_id] = task

        logger.info(f"Started screenshot timer for entry {entry_id} with interval {interval}s")

    async def stop_timer(self, entry_id: str):
        """Stop screenshot capture for a time entry"""
        if entry_id not in self.active_timers:
            logger.warning(f"No active timer for entry {entry_id}")
            return

        # Cancel the async task
        if entry_id in self.tasks:
            self.tasks[entry_id].cancel()
            try:
                await self.tasks[entry_id]
            except asyncio.CancelledError:
                pass
            del self.tasks[entry_id]

        del self.active_timers[entry_id]
        logger.info(f"Stopped screenshot timer for entry {entry_id}")

    async def _screenshot_loop(self, entry_id: str, user_id: str, company_id: str, interval: int):
        """Background task to capture screenshots at random intervals (30s - 10min)"""
        try:
            while entry_id in self.active_timers:
                # Generate random interval between 30 seconds and 10 minutes (600 seconds)
                random_interval = random.randint(30, 600)
                logger.info(f"Next screenshot for entry {entry_id} in {random_interval}s")

                # Wait for the random interval
                await asyncio.sleep(random_interval)

                # Check if timer is still active
                if entry_id not in self.active_timers:
                    break

                # Trigger screenshot capture
                if self.screenshot_callback:
                    try:
                        await self.screenshot_callback(entry_id, user_id, company_id)
                        logger.info(f"Screenshot captured for entry {entry_id} after {random_interval}s wait")
                    except Exception as e:
                        logger.error(f"Error capturing screenshot for entry {entry_id}: {e}")

        except asyncio.CancelledError:
            logger.info(f"Screenshot loop cancelled for entry {entry_id}")
        except Exception as e:
            logger.error(f"Error in screenshot loop for entry {entry_id}: {e}")

    def get_active_timers(self) -> Dict[str, Dict]:
        """Get all active timers"""
        return self.active_timers.copy()

    def is_timer_active(self, entry_id: str) -> bool:
        """Check if a timer is active for an entry"""
        return entry_id in self.active_timers

    async def stop_all_timers(self):
        """Stop all active timers"""
        entry_ids = list(self.active_timers.keys())
        for entry_id in entry_ids:
            await self.stop_timer(entry_id)
        logger.info("All screenshot timers stopped")


# Global scheduler instance
screenshot_scheduler = ScreenshotScheduler()
