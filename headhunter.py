import requests
from telegram import Bot
import asyncio

# Ваши ключи и ID
UKRAINE_ALARM_API_KEY = "9c94eea3:50a9b79885a6ce97bbd77985cde1bf67"
TELEGRAM_BOT_TOKEN = "7473538574:AAEy1EMWakXwUaydZaFKCD_gPY26-wIdz90"
TELEGRAM_CHANNEL_ID = "-1002312991586"
UKRAINE_ALARM_API_URL = "https://api.ukrainealarm.com/api/v3/alerts"

# Инициализация бота
bot = Bot(token=TELEGRAM_BOT_TOKEN)

def get_alerts():
    headers = {
        "Authorization": UKRAINE_ALARM_API_KEY
    }
    response = requests.get(UKRAINE_ALARM_API_URL, headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Ошибка при запросе к API: {response.status_code}")
        return None

async def send_alerts_to_channel(alerts):
    if alerts:
        for alert in alerts:
            region_name = alert.get("regionName", "Неизвестный регион")
            alert_type = alert.get("alertType", "Неизвестный тип")
            message = f"🚨 Внимание! В регионе {region_name} объявлена тревога типа: {alert_type}"
            await bot.send_message(chat_id=TELEGRAM_CHANNEL_ID, text=message)
    else:
        await bot.send_message(chat_id=TELEGRAM_CHANNEL_ID, text="Нет активных тревог.")

async def main():
    while True:
        alerts = get_alerts()
        await send_alerts_to_channel(alerts)
        # Проверяем каждые 5 минут (300 секунд)
        await asyncio.sleep(300)

if __name__ == "__main__":
    asyncio.run(main())