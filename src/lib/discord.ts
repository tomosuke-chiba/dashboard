import { DiscordNotification, ViewRateAlert } from '@/types';

export async function sendDiscordNotification(notification: DiscordNotification): Promise<boolean> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error('Discord webhook URL is not configured');
    return false;
  }

  const isAlert = notification.type === 'alert';

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [
          {
            title: isAlert ? '閲覧率アラート' : '新規応募通知',
            description: notification.message,
            color: isAlert ? 0xff0000 : 0x00ff00, // アラートは赤、応募は緑
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

// 閲覧率30%超アラート送信
export async function sendViewRateAlert(alert: ViewRateAlert): Promise<boolean> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error('Discord webhook URL is not configured');
    return false;
  }

  const viewRatePercent = (alert.viewRate * 100).toFixed(1);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [
          {
            title: '閲覧率異常アラート',
            description: `閲覧率が30%を超えています。不正アクセスの可能性があります。`,
            color: 0xff0000, // 赤色
            fields: [
              {
                name: 'クライアント',
                value: alert.clinicName,
                inline: true,
              },
              {
                name: '日付',
                value: alert.date,
                inline: true,
              },
              {
                name: '閲覧率',
                value: `${viewRatePercent}%`,
                inline: true,
              },
              {
                name: '表示数',
                value: alert.displayCount.toLocaleString(),
                inline: true,
              },
              {
                name: '閲覧数',
                value: alert.viewCount.toLocaleString(),
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('Failed to send view rate alert:', response.statusText);
      return false;
    }

    console.log(`View rate alert sent for ${alert.clinicName}: ${viewRatePercent}%`);
    return true;
  } catch (error) {
    console.error('Error sending view rate alert:', error);
    return false;
  }
}

// 閲覧率チェック（30%超でtrue）
export function isViewRateAbnormal(displayCount: number, viewCount: number): boolean {
  if (displayCount === 0) return false;
  const viewRate = viewCount / displayCount;
  return viewRate > 0.3;
}

// 閲覧率計算
export function calculateViewRate(displayCount: number, viewCount: number): number {
  if (displayCount === 0) return 0;
  return viewCount / displayCount;
}