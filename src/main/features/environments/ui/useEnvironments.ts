// Environments viewmodel. Owns the list, the active selection (persisted), and
// the write path used by "save to environment" and scripts.
import { create } from "zustand";
import { useMemo } from "react";
import { environmentsRepository } from "../data/environments-repository";
import type { Environment } from "../domain/models";
import { EnvValueError, isAllowedSelectedValue, resolveTemplate, withVariable } from "../domain/use-cases";

const ACTIVE_KEY = "flux_active_env";

interface EnvVM {
    environments: Environment[];
    activeId: string | null;
    loaded: boolean;
    load: () => Promise<void>;
    setActive: (id: string | null) => void;
    getActive: () => Environment | null;
    create: (name: string) => Promise<Environment>;
    save: (env: Environment) => Promise<void>;
    remove: (id: string) => Promise<void>;
    setVariable: (key: string, value: string, envId?: string) => Promise<boolean>;
    applyMutations: (mutations: Array<{ key: string; value: string; envId: string | null }>) => Promise<void>;
    resolve: (text: string) => string;
}

export const useEnvironments = create<EnvVM>((set, get) => ({
    environments: [],
    activeId: localStorage.getItem(ACTIVE_KEY),
    loaded: false,

    load: async () => {
        const environments = await environmentsRepository.list();
        let activeId = get().activeId;
        if (!activeId || !environments.some((e) => e.id === activeId)) {
            activeId = environments[0]?.id ?? null;
        }
        set({ environments, activeId, loaded: true });
    },

    setActive: (id) => {
        if (id) localStorage.setItem(ACTIVE_KEY, id);
        else localStorage.removeItem(ACTIVE_KEY);
        set({ activeId: id });
    },

    getActive: () => {
        const { environments, activeId } = get();
        return environments.find((e) => e.id === activeId) ?? null;
    },

    create: async (name) => {
        const env = await environmentsRepository.create(name);
        set((s) => ({ environments: [...s.environments, env] }));
        if (!get().activeId) get().setActive(env.id);
        return env;
    },

    save: async (env) => {
        const updated = await environmentsRepository.update(env);
        set((s) => ({ environments: s.environments.map((e) => (e.id === updated.id ? updated : e)) }));
    },

    remove: async (id) => {
        await environmentsRepository.remove(id);
        set((s) => ({ environments: s.environments.filter((e) => e.id !== id) }));
        if (get().activeId === id) get().setActive(get().environments[0]?.id ?? null);
    },

    setVariable: async (key, value, envId) => {
        const targetId = envId ?? get().activeId;
        const target = get().environments.find((e) => e.id === targetId);
        if (!target) return false;
        try {
            await get().save(withVariable(target, key, value));
        } catch (e) {
            // A "selected" variable rejected the value - report failure to the caller.
            if (e instanceof EnvValueError) return false;
            throw e;
        }
        return true;
    },

    applyMutations: async (mutations) => {
        if (!mutations.length) return;
        const byEnv = new Map<string, Array<{ key: string; value: string }>>();
        for (const m of mutations) {
            const id = m.envId ?? get().activeId;
            if (!id) continue;
            byEnv.set(id, [...(byEnv.get(id) ?? []), { key: m.key, value: m.value }]);
        }
        for (const [envId, writes] of byEnv) {
            let env = get().environments.find((e) => e.id === envId);
            if (!env) continue;
            for (const w of writes) {
                // Never corrupt a "selected" variable with an off-list value (a script,
                // code or save-to-env capture can produce one). Skip - the editors and
                // flow steps surface the constraint up front.
                const existing = env.variables.find((v) => v.key === w.key);
                if (!isAllowedSelectedValue(existing, w.value)) {
                    console.warn(`Env write skipped: "${w.key}" only accepts its variants (got "${w.value}")`);
                    continue;
                }
                env = withVariable(env, w.key, w.value);
            }
            await get().save(env);
        }
    },

    resolve: (text) => resolveTemplate(text, get().getActive()),
}));

// Distinct variable names across all environments - for autocomplete. Suggests
// only; callers stay free to type a new name.
export function useVariableNames(): string[] {
    const environments = useEnvironments((s) => s.environments);
    return useMemo(() => {
        const names = new Set<string>();
        for (const e of environments) for (const v of e.variables) if (v.key.trim()) names.add(v.key.trim());
        return Array.from(names).sort();
    }, [environments]);
}
