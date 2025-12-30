import { createClient } from '@supabase/supabase-js';

const BITLY_API_BASE = 'https://api-ssl.bitly.com/v4';

interface BitlyClicksSummary {
  total_clicks: number;
  units: number;
  unit: string;
  unit_reference: string;
}

interface BitlyClicksByDate {
  clicks: number;
  date: string;
}

interface BitlyClicksResponse {
  link_clicks: BitlyClicksByDate[];
  units: number;
  unit: string;
  unit_reference: string;
}

// Bitly APIクライアント
export class BitlyClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  // 短縮URLからbitlinkを抽出 (例: https://bit.ly/xxxxx → bit.ly/xxxxx)
  private extractBitlink(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.host}${urlObj.pathname}`;
    } catch {
      // URLとして解析できない場合はそのまま返す
      return url.replace(/^https?:\/\//, '');
    }
  }

  // クリック数のサマリーを取得
  async getClicksSummary(bitlinkUrl: string): Promise<number> {
    const bitlink = this.extractBitlink(bitlinkUrl);

    try {
      const response = await fetch(
        `${BITLY_API_BASE}/bitlinks/${encodeURIComponent(bitlink)}/clicks/summary`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error(`Bitly API error: ${response.status} ${response.statusText}`);
        return 0;
      }

      const data: BitlyClicksSummary = await response.json();
      return data.total_clicks;
    } catch (error) {
      console.error('Error fetching Bitly clicks summary:', error);
      return 0;
    }
  }

  // 日別クリック数を取得
  async getClicksByDate(bitlinkUrl: string, unit: 'day' | 'week' | 'month' = 'day', units: number = 30): Promise<BitlyClicksByDate[]> {
    const bitlink = this.extractBitlink(bitlinkUrl);

    try {
      const response = await fetch(
        `${BITLY_API_BASE}/bitlinks/${encodeURIComponent(bitlink)}/clicks?unit=${unit}&units=${units}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error(`Bitly API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data: BitlyClicksResponse = await response.json();
      return data.link_clicks;
    } catch (error) {
      console.error('Error fetching Bitly clicks by date:', error);
      return [];
    }
  }
}

// Bitlyクリック数を取得してDBに保存
export async function fetchAndSaveBitlyClicks(
  clinicId: string,
  bitlyUrl: string
): Promise<boolean> {
  const accessToken = process.env.BITLY_ACCESS_TOKEN;

  if (!accessToken) {
    console.error('BITLY_ACCESS_TOKEN is not configured');
    return false;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase credentials are not configured');
    return false;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const client = new BitlyClient(accessToken);

  try {
    // 過去30日分の日別クリック数を取得
    const clicksByDate = await client.getClicksByDate(bitlyUrl, 'day', 30);

    if (clicksByDate.length === 0) {
      console.log(`No click data found for ${bitlyUrl}`);
      return true;
    }

    // 各日のクリック数をDBに保存
    for (const { date, clicks } of clicksByDate) {
      // dateは "2025-12-30T00:00:00+0000" 形式なので日付部分のみ抽出
      const dateOnly = date.split('T')[0];

      const { error } = await supabase
        .from('bitly_clicks')
        .upsert(
          {
            clinic_id: clinicId,
            date: dateOnly,
            click_count: clicks,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'clinic_id,date',
          }
        );

      if (error) {
        console.error(`Error saving Bitly clicks for ${dateOnly}:`, error);
      }
    }

    console.log(`Saved Bitly clicks for clinic ${clinicId}: ${clicksByDate.length} days`);
    return true;
  } catch (error) {
    console.error('Error in fetchAndSaveBitlyClicks:', error);
    return false;
  }
}

// 全クリニックのBitlyクリック数を取得
export async function fetchAllClinicsBitlyClicks(): Promise<{
  success: string[];
  failed: string[];
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase credentials are not configured');
    return { success: [], failed: [] };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // bitly_urlが設定されているクリニックを取得
  const { data: clinics, error } = await supabase
    .from('clinics')
    .select('id, name, bitly_url')
    .not('bitly_url', 'is', null);

  if (error) {
    console.error('Error fetching clinics:', error);
    return { success: [], failed: [] };
  }

  const success: string[] = [];
  const failed: string[] = [];

  for (const clinic of clinics || []) {
    if (!clinic.bitly_url) continue;

    const result = await fetchAndSaveBitlyClicks(clinic.id, clinic.bitly_url);
    if (result) {
      success.push(clinic.name);
    } else {
      failed.push(clinic.name);
    }
  }

  return { success, failed };
}