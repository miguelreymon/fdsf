import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { AdItem, DuplicateRecord, PortalItem } from '../types.js';

const rawSupabaseUrl = (process.env.SUPABASE_URL || 'https://rbrmymyyautruwatonkw.supabase.co').trim();
const SUPABASE_URL = rawSupabaseUrl.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || 'sb_publishable_1rh-0UDyeWSQyl40BX66sA_KH0ffHT5').trim();

export let supabase: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    console.log('✓ Supabase Client inicializado correctamente con:', SUPABASE_URL);
  } catch (err) {
    console.error('Error al inicializar Supabase Client:', err);
  }
}

export function isSupabaseReady(): boolean {
  return Boolean(supabase);
}

// Helper: Convert database row to AdItem
export function rowToAd(row: any): AdItem {
  return {
    id: String(row.id || row.ad_id),
    title: row.title || '',
    imageUrl: row.image_url || row.imageUrl || '',
    images: Array.isArray(row.images) ? row.images : row.images ? JSON.parse(row.images) : [],
    croppedImages: Array.isArray(row.cropped_images)
      ? row.cropped_images
      : Array.isArray(row.croppedImages)
      ? row.croppedImages
      : [],
    detectedName: row.detected_name || row.detectedName || '',
    nationality: row.nationality || '',
    description: row.description || '',
    phone: row.phone || '',
    normalizedPhone: row.normalized_phone || row.normalizedPhone || row.phone || '',
    hasWhatsapp: row.has_whatsapp ?? row.hasWhatsapp ?? true,
    whatsappUrl: row.whatsapp_url || row.whatsappUrl || '',
    sourceUrl: row.source_url || row.sourceUrl || '',
    category: row.category || 'General',
    location: row.location || 'Madrid',
    scrapedAt: row.scraped_at || row.scrapedAt || row.created_at || new Date().toISOString(),
    sourceSite: row.source_site || row.sourceSite || 'portal',
    notes: row.notes || '',
    status: (row.status as any) || 'nuevo',
    contactedVia: row.contacted_via || row.contactedVia || undefined,
    lastContactedAt: row.last_contacted_at || row.lastContactedAt || undefined,
    isFullAd: Boolean(row.is_full_ad ?? row.isFullAd),
  };
}

// Helper: Convert AdItem to database row (supports standard snake_case and camelCase)
export function adToRow(ad: AdItem): Record<string, any> {
  return {
    id: ad.id,
    title: ad.title || '',
    phone: ad.phone || '',
    normalized_phone: ad.normalizedPhone || ad.phone || '',
    detected_name: ad.detectedName || '',
    location: ad.location || 'Madrid',
    category: ad.category || 'General',
    source_site: ad.sourceSite || 'portal',
    source_url: ad.sourceUrl || '',
    image_url: ad.imageUrl || '',
    images: ad.images || [],
    cropped_images: ad.croppedImages || [],
    nationality: ad.nationality || '',
    description: ad.description || '',
    has_whatsapp: ad.hasWhatsapp ?? true,
    whatsapp_url: ad.whatsappUrl || '',
    status: ad.status || 'nuevo',
    contacted_via: ad.contactedVia || '',
    last_contacted_at: ad.lastContactedAt || null,
    notes: ad.notes || '',
    is_full_ad: Boolean(ad.isFullAd),
    scraped_at: ad.scrapedAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// 1. Fetch All Ads from Supabase
export async function fetchAdsFromSupabase(): Promise<{ success: boolean; ads: AdItem[]; error?: string }> {
  if (!supabase) return { success: false, ads: [], error: 'Supabase no inicializado' };

  try {
    const { data, error } = await supabase
      .from('ads')
      .select('*')
      .order('scraped_at', { ascending: false });

    if (error) {
      return { success: false, ads: [], error: error.message };
    }

    return {
      success: true,
      ads: (data || []).map(rowToAd),
    };
  } catch (err: any) {
    return { success: false, ads: [], error: err.message };
  }
}

// 2. Upsert Batch of Ads into Supabase (in chunks of 50 to avoid payload timeouts)
export async function upsertAdsBatchToSupabase(ads: AdItem[]): Promise<{ success: boolean; count: number; error?: string }> {
  if (!supabase || ads.length === 0) return { success: false, count: 0 };

  try {
    const rows = ads.map(adToRow);
    const chunkSize = 50;
    let totalUpserted = 0;

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabase
        .from('ads')
        .upsert(chunk, { onConflict: 'id' });

      if (error) {
        console.error('Supabase upsertAdsBatch chunk error:', error);
        return { success: false, count: totalUpserted, error: error.message };
      }
      totalUpserted += chunk.length;
    }

    return { success: true, count: totalUpserted };
  } catch (err: any) {
    console.error('Supabase upsert error:', err);
    return { success: false, count: 0, error: err.message };
  }
}

// 3. Update Single Ad in Supabase
export async function updateAdInSupabase(id: string, updates: Partial<AdItem>): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase no inicializado' };

  try {
    const dbUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.contactedVia !== undefined) dbUpdates.contacted_via = updates.contactedVia;
    if (updates.lastContactedAt !== undefined) dbUpdates.last_contacted_at = updates.lastContactedAt;
    if (updates.detectedName !== undefined) dbUpdates.detected_name = updates.detectedName;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.phone !== undefined) {
      dbUpdates.phone = updates.phone;
      dbUpdates.normalized_phone = updates.normalizedPhone || updates.phone;
    }

    const { error } = await supabase
      .from('ads')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      console.error('Supabase updateAd error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// 4. Delete Single Ad in Supabase
export async function deleteAdFromSupabase(id: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('ads')
      .delete()
      .eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

// 5. Delete Batch of Ads in Supabase
export async function deleteBatchFromSupabase(ids: string[]): Promise<boolean> {
  if (!supabase || ids.length === 0) return false;
  try {
    const { error } = await supabase
      .from('ads')
      .delete()
      .in('id', ids);
    return !error;
  } catch {
    return false;
  }
}

// 6. Delete Ads by City in Supabase
export async function deleteByCityInSupabase(cityName: string): Promise<number> {
  if (!supabase) return 0;
  try {
    const { data, error } = await supabase
      .from('ads')
      .delete()
      .ilike('location', `%${cityName}%`)
      .select('id');

    if (error || !data) return 0;
    return data.length;
  } catch {
    return 0;
  }
}

// 7. Clear All Ads in Supabase
export async function clearAllAdsInSupabase(): Promise<boolean> {
  if (!supabase) return false;
  try {
    // Delete all where id is not null
    const { error } = await supabase
      .from('ads')
      .delete()
      .neq('id', '___non_existent___');
    return !error;
  } catch {
    return false;
  }
}

// 8. Fetch Duplicates from Supabase
export async function fetchDuplicatesFromSupabase(): Promise<DuplicateRecord[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('duplicates')
      .select('*')
      .order('detected_at', { ascending: false });

    if (error || !data) return [];
    return data.map(r => ({
      phone: r.phone,
      normalizedPhone: r.normalized_phone || r.phone,
      title: r.title,
      existingTitle: r.existing_title || r.existingTitle,
      sourceUrl: r.source_url || r.sourceUrl,
      detectedAt: r.detected_at || r.detectedAt,
    }));
  } catch {
    return [];
  }
}

// 9. Save Duplicates to Supabase
export async function saveDuplicatesToSupabase(duplicates: DuplicateRecord[]): Promise<void> {
  if (!supabase || duplicates.length === 0) return;
  try {
    const rows = duplicates.map(d => ({
      phone: d.phone,
      normalized_phone: d.normalizedPhone,
      title: d.title,
      existing_title: d.existingTitle,
      source_url: d.sourceUrl,
      detected_at: d.detectedAt || new Date().toISOString(),
    }));
    await supabase.from('duplicates').upsert(rows, { onConflict: 'phone' });
  } catch (err) {
    console.error('Error saving duplicates to Supabase:', err);
  }
}

// 10. Fetch Portals from Supabase
export async function fetchPortalsFromSupabase(): Promise<PortalItem[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('portals')
      .select('*')
      .order('rank', { ascending: true });

    if (error || !data || data.length === 0) return null;
    return data.map(p => ({
      id: p.id,
      name: p.name,
      domain: p.domain,
      url: p.url || `https://${p.domain}/`,
      logoUrl: p.logo_url || p.logoUrl || `https://www.google.com/s2/favicons?domain=${p.domain}&sz=128`,
      seoRank: Number(p.seo_rank ?? p.seoRank ?? p.rank ?? 1),
      monthlyVisitsEstimated: p.monthly_visits_estimated || p.monthlyVisitsEstimated || '',
      description: p.description || '',
      addedAt: p.added_at || p.addedAt || p.created_at || new Date().toISOString(),
    }));
  } catch {
    return null;
  }
}

// 11. Save Portals to Supabase
export async function savePortalsToSupabase(portals: PortalItem[]): Promise<void> {
  if (!supabase || portals.length === 0) return;
  try {
    const rows = portals.map((p, idx) => ({
      id: p.id,
      name: p.name,
      domain: p.domain,
      url: p.url || `https://${p.domain}/`,
      logo_url: p.logoUrl || '',
      seo_rank: p.seoRank || idx + 1,
      monthly_visits_estimated: p.monthlyVisitsEstimated || '',
      description: p.description || '',
      added_at: p.addedAt || new Date().toISOString(),
      rank: idx + 1,
    }));
    await supabase.from('portals').upsert(rows, { onConflict: 'id' });
  } catch (err) {
    console.error('Error saving portals to Supabase:', err);
  }
}

// 12. Check Supabase Tables & Health
export async function checkSupabaseHealth(): Promise<{
  connected: boolean;
  url: string;
  hasAnonKey: boolean;
  tables: {
    ads: { exists: boolean; count: number; error?: string | null };
    duplicates: { exists: boolean; count: number; error?: string | null };
    portals: { exists: boolean; count: number; error?: string | null };
  };
  landingTables: {
    app_content: boolean;
    inquiries: boolean;
    payment_leads: boolean;
    fake_users: boolean;
  };
  isFullyReady: boolean;
}> {
  const result = {
    connected: Boolean(supabase),
    url: SUPABASE_URL,
    hasAnonKey: Boolean(SUPABASE_ANON_KEY),
    tables: {
      ads: { exists: false, count: 0, error: null as string | null },
      duplicates: { exists: false, count: 0, error: null as string | null },
      portals: { exists: false, count: 0, error: null as string | null },
    },
    landingTables: {
      app_content: false,
      inquiries: false,
      payment_leads: false,
      fake_users: false,
    },
    isFullyReady: false,
  };

  if (!supabase) return result;

  // Check landing tables (read-only verification)
  try {
    const [c1, c2, c3, c4] = await Promise.all([
      supabase.from('app_content').select('id').limit(1),
      supabase.from('inquiries').select('id').limit(1),
      supabase.from('payment_leads').select('id').limit(1),
      supabase.from('fake_users').select('id').limit(1),
    ]);
    result.landingTables.app_content = !c1.error;
    result.landingTables.inquiries = !c2.error;
    result.landingTables.payment_leads = !c3.error;
    result.landingTables.fake_users = !c4.error;
  } catch {}

  // Check ads table
  try {
    const { count, error } = await supabase
      .from('ads')
      .select('id', { count: 'exact' })
      .limit(1);

    if (error) {
      result.tables.ads.error = error.message;
      result.tables.ads.exists = false;
    } else {
      result.tables.ads.exists = true;
      result.tables.ads.count = count ?? 0;
    }
  } catch (err: any) {
    result.tables.ads.error = err.message;
  }

  // Check duplicates table
  try {
    const { count, error } = await supabase
      .from('duplicates')
      .select('phone', { count: 'exact' })
      .limit(1);

    if (error) {
      result.tables.duplicates.error = error.message;
      result.tables.duplicates.exists = false;
    } else {
      result.tables.duplicates.exists = true;
      result.tables.duplicates.count = count ?? 0;
    }
  } catch (err: any) {
    result.tables.duplicates.error = err.message;
  }

  // Check portals table
  try {
    const { count, error } = await supabase
      .from('portals')
      .select('id', { count: 'exact' })
      .limit(1);

    if (error) {
      result.tables.portals.error = error.message;
      result.tables.portals.exists = false;
    } else {
      result.tables.portals.exists = true;
      result.tables.portals.count = count ?? 0;
    }
  } catch (err: any) {
    result.tables.portals.error = err.message;
  }

  result.isFullyReady = result.tables.ads.exists && result.tables.duplicates.exists && result.tables.portals.exists;
  return result;
}

// 13. Fetch Landing Page Leads (Read-Only)
export async function fetchLandingLeadsFromSupabase(): Promise<{
  inquiries: any[];
  paymentLeads: any[];
}> {
  if (!supabase) return { inquiries: [], paymentLeads: [] };
  try {
    const [inqRes, payRes] = await Promise.all([
      supabase.from('inquiries').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('payment_leads').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    return {
      inquiries: inqRes.data || [],
      paymentLeads: payRes.data || [],
    };
  } catch {
    return { inquiries: [], paymentLeads: [] };
  }
}
