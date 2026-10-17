# pyrefly: ignore [missing-import]
import datetime
import json
import os
from zoneinfo import ZoneInfo
import aiohttp
import discord
from discord.ext import commands, tasks
from dotenv import load_dotenv

# Load environment variables from .env file (check bot directory and current directory)
env_file_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path=env_file_path)
load_dotenv()

int_token = os.getenv("DISCORD_TOKEN")
morning_user_id = os.getenv("IVY_USER_ID")

# Intents for the bot
intents = discord.Intents.default()

bot = commands.Bot(command_prefix="!", intents=intents)
greeted_guild_ids = set()
LONDON_TZ = ZoneInfo("Europe/London")
NY_TZ = ZoneInfo("America/New_York")
GMORNING_TIME = datetime.time(hour=8, minute=0, second=0, tzinfo=LONDON_TZ)

# Window limits in minutes from midnight (8:00 London time to 24:00 midnight)
WINDOW_START_MINUTES = 8 * 60   # 480
WINDOW_END_MINUTES = 24 * 60   # 1440

ALLOWED_USERS = {"cwis", "monokork", "both"}


def parse_time_to_minutes(time_str: str, is_end: bool = False) -> int | None:
    """Parse time string like '10:00', '14:30', or '08:00:00' to minutes from midnight."""
    if not time_str or not isinstance(time_str, str):
        return None
    try:
        parts = time_str.strip().split(":")
        h = int(parts[0])
        m = int(parts[1]) if len(parts) > 1 else 0
        if is_end and h == 0 and m == 0:
            return WINDOW_END_MINUTES
        return h * 60 + m
    except (ValueError, IndexError):
        return None


def union_intervals(intervals: list[tuple[int, int]]) -> list[tuple[int, int]]:
    """Performs union on a list of busy interval tuples, merging overlapping or contiguous blocks."""
    if not intervals:
        return []
    sorted_intervals = sorted(intervals, key=lambda x: (x[0], x[1]))
    merged = [list(sorted_intervals[0])]
    for start, end in sorted_intervals[1:]:
        last = merged[-1]
        if start <= last[1]:
            last[1] = max(last[1], end)
        else:
            merged.append([start, end])
    return [(s, e) for s, e in merged]


def subtract_union_from_window(
    busy_union: list[tuple[int, int]],
    window_start: int = WINDOW_START_MINUTES,
    window_end: int = WINDOW_END_MINUTES,
) -> list[tuple[int, int]]:
    """Subtracts the busy union from the base window [08:00, 24:00], leaving only mutual free intervals."""
    free_intervals: list[tuple[int, int]] = []
    curr = window_start
    for b_start, b_end in busy_union:
        if b_start > curr:
            free_intervals.append((curr, b_start))
        curr = max(curr, b_end)
    if curr < window_end:
        free_intervals.append((curr, window_end))
    return free_intervals


def format_time_label(h: int, m: int) -> str:
    """Formats hour and minute (e.g. 10 -> '10', 10:30 -> '10:30')."""
    if m == 0:
        return f"{h}"
    return f"{h}:{m:02d}"


def format_free_times_message(free_intervals: list[tuple[int, int]], target_date: datetime.date) -> str:
    """
    Formats free intervals into the requested dual-timezone format:
    'You are both free during: 10-14 bst/ 5-9 est, 15-17 bst/ 10-12 est, and 19-24 bst/ 14-19 est'
    """
    if not free_intervals:
        return "You are both free during: None"

    base_london = datetime.datetime(
        target_date.year, target_date.month, target_date.day, 0, 0, tzinfo=LONDON_TZ
    )

    parts: list[str] = []
    for start_m, end_m in free_intervals:
        # London time
        b_s_h, b_s_m = divmod(start_m, 60)
        b_e_h, b_e_m = divmod(end_m, 60)

        # Eastern time conversion
        dt_s_london = base_london + datetime.timedelta(minutes=start_m)
        dt_e_london = base_london + datetime.timedelta(minutes=end_m)
        dt_s_ny = dt_s_london.astimezone(NY_TZ)
        dt_e_ny = dt_e_london.astimezone(NY_TZ)

        e_s_h, e_s_m = dt_s_ny.hour, dt_s_ny.minute
        e_e_h, e_e_m = dt_e_ny.hour, dt_e_ny.minute

        london_str = f"{format_time_label(b_s_h, b_s_m)}-{format_time_label(b_e_h, b_e_m)} bst"
        ny_str = f"{format_time_label(e_s_h, e_s_m)}-{format_time_label(e_e_h, e_e_m)} est"
        parts.append(f"{london_str}/{ny_str}")

    if len(parts) == 1:
        joined_str = parts[0]
    elif len(parts) == 2:
        joined_str = f"{parts[0]} and {parts[1]}"
    else:
        joined_str = f"{', '.join(parts[:-1])}, and {parts[-1]}"

    return f"You are both free during: {joined_str}"


async def fetch_events_for_date(target_date: datetime.date) -> list[dict]:
    """Fetches events for target_date from Supabase REST API or local cache/fallback."""
    date_str = target_date.strftime("%Y-%m-%d")

    # 1. Supabase REST API
    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
    supabase_key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("SUPABASE_KEY")
        or os.getenv("SUPABASE_ANON_KEY")
        or os.getenv("VITE_SUPABASE_ANON_KEY")
    )

    if supabase_url and supabase_key:
        try:
            url = f"{supabase_url.rstrip('/')}/rest/v1/events"
            headers = {
                "apikey": supabase_key,
                "Authorization": f"Bearer {supabase_key}",
                "Content-Type": "application/json",
            }
            params = {
                "select": "*",
                "date": f"eq.{date_str}",
            }
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers, params=params, timeout=10) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if isinstance(data, list):
                            return data
                    else:
                        print(f"Supabase REST query returned status {resp.status}")
        except Exception as e:
            print(f"Error querying Supabase: {e}")

    # 2. Local fallback events.json (if present)
    for path in [
        os.path.join(os.path.dirname(__file__), "events.json"),
        os.path.join(os.getcwd(), "events.json"),
    ]:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        return [e for e in data if e.get("date") == date_str]
            except Exception as e:
                print(f"Error reading local events from {path}: {e}")

    # 3. Default demo sample events fallback (aligned with src/lib/overlap-finder/db.ts)
    sample_events = [
        {
            "id": "evt-init-1",
            "date": "2026-10-17",
            "start_time": "10:00",
            "end_time": "11:30",
            "title": "Coffee & Catchup",
            "user_id": "cwis",
        },
        {
            "id": "evt-init-2",
            "date": "2026-10-17",
            "start_time": "11:00",
            "end_time": "12:30",
            "title": "Grocery Run",
            "user_id": "monokork",
        },
        {
            "id": "evt-init-3",
            "date": "2026-10-19",
            "start_time": "14:00",
            "end_time": "15:30",
            "title": "Movie Night Prep",
            "user_id": "cwis",
        },
        {
            "id": "evt-init-4",
            "date": "2026-10-21",
            "start_time": "18:00",
            "end_time": "20:00",
            "title": "Dinner Date",
            "user_id": "cwis",
        },
        {
            "id": "evt-init-5",
            "date": "2026-10-23",
            "start_time": "16:00",
            "end_time": "17:30",
            "title": "Gym Session",
            "user_id": "monokork",
        },
    ]
    return [e for e in sample_events if e.get("date") == date_str]


async def get_daily_free_time_message(target_date: datetime.date | None = None) -> str:
    """
    Searches the database for that day, pulls data from after 08:00:00 London time
    for both cwis and monokork, unions busy times, subtracts from original window,
    and returns the formatted free time message.
    """
    if target_date is None:
        target_date = datetime.datetime.now(LONDON_TZ).date()

    events = await fetch_events_for_date(target_date)

    busy_intervals: list[tuple[int, int]] = []
    for evt in events:
        raw_uid = (evt.get("user_id") or "cwis").strip().lower()
        if raw_uid not in ALLOWED_USERS:
            continue

        s_m = parse_time_to_minutes(evt.get("start_time"), is_end=False)
        e_m = parse_time_to_minutes(evt.get("end_time"), is_end=True)
        if s_m is None or e_m is None:
            continue

        # Only pull/consider times after 08:00:00 London time for that day
        b_s = max(WINDOW_START_MINUTES, s_m)
        b_e = min(WINDOW_END_MINUTES, e_m)
        if b_e > b_s:
            busy_intervals.append((b_s, b_e))

    # Perform union on the times each user is busy on
    busy_union = union_intervals(busy_intervals)

    # Subtract the union from the original data (08:00 - 24:00), leaving only mutual free times
    free_intervals = subtract_union_from_window(busy_union)

    return format_free_times_message(free_intervals, target_date)


@bot.event
async def on_ready():
    print(f"Logged in as {bot.user.name}")
    print(f"Discord ID: {bot.user.id}")
    await bot.tree.sync()
    if not scheduled_message.is_running():
        scheduled_message.start()

    for guild in bot.guilds:
        if guild.id in greeted_guild_ids:
            continue

        channel = guild.system_channel
        if channel is None or not channel.permissions_for(guild.me).send_messages:
            channel = next(
                (
                    text_channel
                    for text_channel in guild.text_channels
                    if text_channel.permissions_for(guild.me).send_messages
                ),
                None,
            )

        if channel is not None:
            await channel.send("Hello!")
            greeted_guild_ids.add(guild.id)


@tasks.loop(time=GMORNING_TIME)
async def scheduled_message():
    channel_id = int(os.getenv("DISCORD_CHANNEL_ID", "1560016164753637509"))
    channel = bot.get_channel(channel_id)
    if channel is None:
        try:
            channel = await bot.fetch_channel(channel_id)
        except Exception as e:
            print(f"Failed to fetch channel {channel_id}: {e}")
            channel = None

    if channel:
        mention = f"<@{morning_user_id}> " if morning_user_id else ""
        await channel.send(
            f"Good morning, {mention}Hope you have a good day, my beautiful wife! <3",
            allowed_mentions=discord.AllowedMentions(users=True, roles=False, everyone=False),
        )

        # After sending the good morning message, send the mutual free time message
        try:
            free_message = await get_daily_free_time_message()
            await channel.send(free_message)
        except Exception as e:
            print(f"Error computing or sending free time message: {e}")


# Slash command to check whether the bot is online
@bot.tree.command(name="ping", description="Check whether the bot is online")
async def ping(interaction: discord.Interaction):
    await interaction.response.send_message("Pong!")


# Slash command to check mutual free times on demand
@bot.tree.command(name="freetime", description="Check mutual free times for Cwis and Monokork today")
async def freetime(interaction: discord.Interaction):
    await interaction.response.defer()
    msg = await get_daily_free_time_message()
    await interaction.followup.send(msg)


if __name__ == "__main__":
    if not int_token:
        raise RuntimeError("DISCORD_TOKEN is missing from the environment or .env file")
    bot.run(int_token)
