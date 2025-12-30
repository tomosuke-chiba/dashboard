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

interface BitlyLink {
  id: string;
  link: string;
  long_url: string;
  title: string;
  created_at: string;
  custom_bitlinks: string[];
}

interface BitlyLinksResponse {
  links: BitlyLink[];
  pagination: {
    total: number;
    size: number;
    prev: string;
    next: string;
    page: number;
  };
}

interface BitlyGroupsResponse {
  groups: {
    guid: string;
    name: string;
    created: string;
    modified: string;
    bsds: string[];
    organization_guid: string;
    is_active: boolean;
    role: string;
    default_group_guid: string;
  }[];
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

  // デフォルトグループのGUIDを取得
  async getDefaultGroupGuid(): Promise<string | null> {
    try {
      const response = await fetch(`${BITLY_API_BASE}/groups`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`Bitly API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data: BitlyGroupsResponse = await response.json();
      if (data.groups.length > 0) {
        return data.groups[0].guid;
      }
      return null;
    } catch (error) {
      console.error('Error fetching Bitly groups:', error);
      return null;
    }
  }

  // グループ内の全リンクを取得（ページネーション対応）
  async getGroupLinks(groupGuid: string, size: number = 100): Promise<BitlyLink[]> {
    const allLinks: BitlyLink[] = [];
    let page = 1;
    let hasMore = true;

    try {
      while (hasMore) {
        const response = await fetch(
          `${BITLY_API_BASE}/groups/${groupGuid}/bitlinks?size=${size}&page=${page}`,
          {
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          console.error(`Bitly API error: ${response.status} ${response.statusText}`);
          break;
        }

        const data: BitlyLinksResponse = await response.json();
        allLinks.push(...data.links);

        // 次のページがあるかチェック
        if (data.links.length < size || !data.pagination.next) {
          hasMore = false;
        } else {
          page++;
        }
      }

      return allLinks;
    } catch (error) {
      console.error('Error fetching group links:', error);
      return allLinks;
    }
  }

  // 命名規則でリンクをフィルタリング
  // 形式: bit.ly/{clinicSlug}-{source}-{id}
  filterLinksByClinic(
    links: BitlyLink[],
    clinicSlug: string,
    source?: string
  ): BitlyLink[] {
    const prefix = source
      ? `${clinicSlug}-${source}-`
      : `${clinicSlug}-`;

    return links.filter((link) => {
      // linkは "https://bit.ly/xxx" 形式
      const bitlink = this.extractBitlink(link.link);
      const path = bitlink.replace('bit.ly/', '');
      return path.startsWith(prefix);
    });
  }

  // リンクから情報を抽出
  // bit.ly/tsutani-guppy-001 → { clinicSlug: 'tsutani', source: 'guppy', linkId: '001' }
  parseBitlink(bitlink: string): { clinicSlug: string; source: string; linkId: string } | null {
    const path = bitlink.replace(/^(https?:\/\/)?bit\.ly\//, '');
    const parts = path.split('-');

    if (parts.length < 3) {
      return null;
    }

    // 最後の要素がlinkId、その前がsource、残りがclinicSlug
    const linkId = parts.pop()!;
    const source = parts.pop()!;
    const clinicSlug = parts.join('-');

    return { clinicSlug, source, linkId };
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

// クリニック別のBitlyリンクを自動検出して取得・保存
export async function fetchAndSaveBitlyLinkClicks(): Promise<{
  clinicsProcessed: number;
  linksProcessed: number;
  errors: string[];
}> {
  const accessToken = process.env.BITLY_ACCESS_TOKEN;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!accessToken || !supabaseUrl || !supabaseServiceKey) {
    console.error('Required environment variables are not configured');
    return { clinicsProcessed: 0, linksProcessed: 0, errors: ['Missing env vars'] };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const client = new BitlyClient(accessToken);
  const errors: string[] = [];

  // 1. グループGUIDを取得
  const groupGuid = await client.getDefaultGroupGuid();
  if (!groupGuid) {
    return { clinicsProcessed: 0, linksProcessed: 0, errors: ['Failed to get group GUID'] };
  }

  // 2. グループ内の全リンクを取得
  const allLinks = await client.getGroupLinks(groupGuid);
  console.log(`Fetched ${allLinks.length} Bitly links from group`);

  // 3. 全クリニックを取得
  const { data: clinics, error: clinicsError } = await supabase
    .from('clinics')
    .select('id, slug, name');

  if (clinicsError || !clinics) {
    return { clinicsProcessed: 0, linksProcessed: 0, errors: ['Failed to fetch clinics'] };
  }

  let clinicsProcessed = 0;
  let linksProcessed = 0;

  // 4. 各クリニックのリンクをフィルタリングして処理
  for (const clinic of clinics) {
    const clinicLinks = client.filterLinksByClinic(allLinks, clinic.slug);

    if (clinicLinks.length === 0) {
      continue;
    }

    clinicsProcessed++;
    console.log(`[${clinic.name}] Found ${clinicLinks.length} Bitly links`);

    // 5. 各リンクをDBに登録し、クリック数を取得
    for (const link of clinicLinks) {
      const parsed = client.parseBitlink(link.link);
      if (!parsed) {
        errors.push(`Failed to parse bitlink: ${link.link}`);
        continue;
      }

      const bitlink = link.link.replace(/^https?:\/\//, '');

      // bitly_linksテーブルにUPSERT
      const { data: savedLink, error: linkError } = await supabase
        .from('bitly_links')
        .upsert({
          clinic_id: clinic.id,
          bitlink: bitlink,
          source: parsed.source,
          link_id: parsed.linkId,
          long_url: link.long_url,
        }, {
          onConflict: 'bitlink'
        })
        .select()
        .single();

      if (linkError) {
        errors.push(`Failed to save link ${bitlink}: ${linkError.message}`);
        continue;
      }

      // 日別クリック数を取得
      const clicksByDate = await client.getClicksByDate(link.link, 'day', 30);

      // bitly_link_clicksテーブルに保存
      for (const { date, clicks } of clicksByDate) {
        const dateOnly = date.split('T')[0];

        const { error: clickError } = await supabase
          .from('bitly_link_clicks')
          .upsert({
            bitly_link_id: savedLink.id,
            date: dateOnly,
            click_count: clicks,
          }, {
            onConflict: 'bitly_link_id,date'
          });

        if (clickError) {
          errors.push(`Failed to save clicks for ${bitlink} on ${dateOnly}: ${clickError.message}`);
        }
      }

      linksProcessed++;
    }
  }

  console.log(`Processed ${clinicsProcessed} clinics, ${linksProcessed} links`);
  return { clinicsProcessed, linksProcessed, errors };
}