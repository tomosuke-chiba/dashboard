import { DiscordNotification } from '@/types';

export async function sendDiscordNotification(notification: DiscordNotification): Promise<boolean> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error('Discord webhook URL is not configured');
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [
          {
            title: '新規応募通知',
            description: notification.message,
            color: 0x00ff00, // 緑色
            fields: [
              {
                name: 'クライアント',
                value: notification.clinicName,
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('Failed to send Discord notification:', response.statusText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending Discord notification:', error);
    return false;
  }
}
