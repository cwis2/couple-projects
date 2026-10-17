import asyncio
import datetime
import unittest
from unittest.mock import patch, MagicMock
from zoneinfo import ZoneInfo

from main import (
    parse_time_to_minutes,
    union_intervals,
    subtract_union_from_window,
    format_time_label,
    format_free_times_message,
    get_daily_free_time_message,
    WINDOW_START_MINUTES,
    WINDOW_END_MINUTES,
)


class TestFreeTimeLogic(unittest.TestCase):
    def setUp(self):
        self.sample_date = datetime.date(2026, 10, 17)

    def test_parse_time_to_minutes(self):
        self.assertEqual(parse_time_to_minutes("08:00"), 480)
        self.assertEqual(parse_time_to_minutes("10:30"), 630)
        self.assertEqual(parse_time_to_minutes("24:00"), 1440)
        self.assertEqual(parse_time_to_minutes("00:00", is_end=True), 1440)
        self.assertEqual(parse_time_to_minutes("00:00", is_end=False), 0)
        self.assertEqual(parse_time_to_minutes("08:15:30"), 495)
        self.assertIsNone(parse_time_to_minutes(None))
        self.assertIsNone(parse_time_to_minutes("invalid"))

    def test_union_intervals(self):
        # Disjoint intervals
        intervals = [(480, 600), (840, 900)]
        self.assertEqual(union_intervals(intervals), [(480, 600), (840, 900)])

        # Overlapping intervals
        intervals = [(480, 600), (540, 720)]
        self.assertEqual(union_intervals(intervals), [(480, 720)])

        # Contiguous / touching intervals (e.g. 17-18 and 18-19)
        intervals = [(1020, 1080), (1080, 1140)]
        self.assertEqual(union_intervals(intervals), [(1020, 1140)])

        # Out-of-order intervals
        intervals = [(1020, 1080), (480, 600), (840, 900)]
        self.assertEqual(union_intervals(intervals), [(480, 600), (840, 900), (1020, 1080)])

    def test_subtract_union_from_window_user_prompt_example(self):
        # Union of busy: [8-10] (480-600), [14-15] (840-900), [17-19] (1020-1140)
        busy_union = [(480, 600), (840, 900), (1020, 1140)]
        free = subtract_union_from_window(busy_union)
        expected = [(600, 840), (900, 1020), (1140, 1440)]  # 10-14, 15-17, 19-24
        self.assertEqual(free, expected)

        msg = format_free_times_message(free, self.sample_date)
        self.assertEqual(
            msg,
            "You are both free during: 10-14 bst/ 5-9 est, 15-17 bst/ 10-12 est, and 19-24 bst/ 14-19 est",
        )

    def test_single_interval(self):
        free = [(600, 840)]  # 10-14
        msg = format_free_times_message(free, self.sample_date)
        self.assertEqual(msg, "You are both free during: 10-14 bst/ 5-9 est")

    def test_two_intervals(self):
        free = [(480, 540), (720, 1440)]  # 8-9, 12-24
        msg = format_free_times_message(free, self.sample_date)
        self.assertEqual(msg, "You are both free during: 8-9 bst/ 3-4 est and 12-24 bst/ 7-19 est")

    def test_minutes_formatting(self):
        free = [(630, 855)]  # 10:30 to 14:15
        msg = format_free_times_message(free, self.sample_date)
        self.assertEqual(msg, "You are both free during: 10:30-14:15 bst/ 5:30-9:15 est")

    def test_no_free_time(self):
        busy_union = [(WINDOW_START_MINUTES, WINDOW_END_MINUTES)]
        free = subtract_union_from_window(busy_union)
        msg = format_free_times_message(free, self.sample_date)
        self.assertEqual(msg, "You are both free during: None")

    def test_all_day_free(self):
        busy_union = []
        free = subtract_union_from_window(busy_union)
        msg = format_free_times_message(free, self.sample_date)
        self.assertEqual(msg, "You are both free during: 8-24 bst/ 3-19 est")

    def test_get_daily_free_time_message_mock_events(self):
        mock_events = [
            {"user_id": "monokork", "start_time": "08:00", "end_time": "10:00"},
            {"user_id": "cwis", "start_time": "14:00", "end_time": "15:00"},
            {"user_id": "cwis", "start_time": "17:00", "end_time": "18:00"},
            {"user_id": "monokork", "start_time": "18:00", "end_time": "19:00"},
            # Event before 8:00 should be ignored
            {"user_id": "cwis", "start_time": "06:00", "end_time": "07:30"},
            # Event for someone else should be ignored
            {"user_id": "other_person", "start_time": "11:00", "end_time": "12:00"},
        ]

        with patch("main.fetch_events_for_date", return_value=mock_events):
            msg = asyncio.run(get_daily_free_time_message(self.sample_date))
            self.assertEqual(
                msg,
                "You are both free during: 10-14 bst/ 5-9 est, 15-17 bst/ 10-12 est, and 19-24 bst/ 14-19 est",
            )


if __name__ == "__main__":
    unittest.main()
