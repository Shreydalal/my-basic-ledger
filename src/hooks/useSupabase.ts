import { useState, useEffect, useCallback } from "react";
import { supabase } from '@/lib/supabase';
import { PostgrestError } from '@supabase/supabase-js';

type CacheEnvelope<T> = {
    version: 1;
    savedAt: number;
    data: T[];
};

const CACHE_VERSION = 1 as const;
const CACHE_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

function cacheKey(table: string) {
    return `supabase_cache:${table}`;
}

function loadCache<T>(table: string): CacheEnvelope<T> | null {
    try {
        const raw = localStorage.getItem(cacheKey(table));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as CacheEnvelope<T>;
        if (!parsed || parsed.version !== CACHE_VERSION || !Array.isArray(parsed.data) || typeof parsed.savedAt !== "number") {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

function saveCache<T>(table: string, data: T[]) {
    try {
        const envelope: CacheEnvelope<T> = { version: CACHE_VERSION, savedAt: Date.now(), data };
        localStorage.setItem(cacheKey(table), JSON.stringify(envelope));
    } catch {
        // ignore cache write failures (quota / private mode)
    }
}

export function useSupabase<T extends { id: string }>(table: string) {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<PostgrestError | null>(null);

    const fetchData = useCallback(async (isInitial = false) => {
        if (isInitial) setLoading(true);

        try {
            const { data: result, error } = await supabase
                .from(table)
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error(`Error fetching ${table}:`, error);
                setError(error);
            } else {
                const rows = (result as T[]) ?? [];
                setData(rows);
                saveCache<T>(table, rows);
            }
        } catch (err: any) {
            console.error(`Unexpected error fetching ${table}:`, err);
        } finally {
            if (isInitial) setLoading(false);
        }
    }, [table]);

    useEffect(() => {
        const cached = loadCache<T>(table);
        const now = Date.now();
        const hasFreshCache = !!cached && now - cached.savedAt <= CACHE_MAX_AGE_MS;

        if (cached?.data?.length) {
            setData(cached.data);
            setLoading(false);
        }

        // Always refresh in background; if cache is fresh, do it without blocking UI
        fetchData(!cached || !hasFreshCache);

        const channel = supabase
            .channel(`${table}_changes`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: table,
                },
                (payload) => {
                    console.log(`Real-time update from ${table}:`, payload);
                    fetchData(false);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [table, fetchData]);

    const add = async (item: Omit<T, 'id' | 'created_at'>) => {
        // Optimistic update (requires a temp ID or we wait for server return)
        // We'll wait for server return to be safe, but we won't trigger full reload logic

        const { data: newItem, error } = await supabase
            .from(table)
            .insert([item])
            .select()
            .single();

        if (error) {
            console.error(`Error adding to ${table}:`, error);
            throw error;
        }

        if (newItem) {
            console.log(`Successfully added to ${table}:`, newItem);
            setData(prev => {
                const next = [newItem as T, ...prev];
                saveCache<T>(table, next);
                return next;
            });
        }
        return newItem;
    };

    const update = async (id: string, updates: Partial<T>) => {
        const { data: updatedItem, error } = await supabase
            .from(table)
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error(`Error updating ${table}:`, error);
            throw error;
        }

        if (updatedItem) {
            setData(prev => {
                const next = prev.map(item => item.id === id ? (updatedItem as T) : item);
                saveCache<T>(table, next);
                return next;
            });
        }
        return updatedItem;
    };

    const remove = async (id: string) => {
        const { error } = await supabase
            .from(table)
            .delete()
            .eq('id', id);

        if (error) {
            console.error(`Error deleting from ${table}:`, error);
            throw error;
        }

        setData(prev => {
            const next = prev.filter(item => item.id !== id);
            saveCache<T>(table, next);
            return next;
        });
    };

    return { data, loading, error, add, update, remove, refresh: () => fetchData(false) };
}
