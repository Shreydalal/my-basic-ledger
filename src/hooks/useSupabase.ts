import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { PostgrestError } from '@supabase/supabase-js';

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
                setData(result as T[]);
            }
        } catch (err: any) {
            console.error(`Unexpected error fetching ${table}:`, err);
        } finally {
            if (isInitial) setLoading(false);
        }
    }, [table]);

    useEffect(() => {
        fetchData(true);

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
            setData(prev => [newItem as T, ...prev]);
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
            setData(prev => prev.map(item => item.id === id ? (updatedItem as T) : item));
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

        setData(prev => prev.filter(item => item.id !== id));
    };

    return { data, loading, error, add, update, remove, refresh: () => fetchData(false) };
}
