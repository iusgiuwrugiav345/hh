/*
 * Vencord UserPlugin: AutoScreenShareControl
 *
 * Поведение:
 * - Если в текущий голосовой канал заходит кто-то НЕ из whitelist -> выключить демонстрацию.
 * - Когда все НЕ-whitelist пользователи выходят -> включить демонстрацию обратно,
 *   но только если плагин выключал её сам.
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findStoreLazy } from "@webpack";
import { FluxDispatcher } from "@webpack/common";

const UserStore = findStoreLazy("UserStore");
const VoiceStateStore = findStoreLazy("VoiceStateStore");
const SelectedChannelStore = findStoreLazy("SelectedChannelStore");

const StreamStore = findByPropsLazy("getCurrentUserActiveStream");
const StreamActions = findByPropsLazy("startBroadcasting", "stopBroadcasting", "toggleSelfBroadcast");

const settings = definePluginSettings({
    whitelist: {
        type: OptionType.STRING,
        description: "Whitelist User ID через запятую",
        default: ""
    }
});

let disabledByPlugin = false;
let prevNonWhitelistedCount = 0;

function getWhitelistSet(): Set<string> {
    return new Set(
        settings.store.whitelist
            .split(",")
            .map(s => s.trim())
            .filter(Boolean)
    );
}

function getCurrentVoiceChannelId(): string | null {
    return SelectedChannelStore?.getVoiceChannelId?.() ?? null;
}

function getCurrentUserId(): string | null {
    return UserStore?.getCurrentUser?.()?.id ?? null;
}

function getVoiceMembers(channelId: string): string[] {
    const states = VoiceStateStore?.getVoiceStatesForChannel?.(channelId);
    if (!states) return [];

    return Object.values(states)
        .map((state: any) => state?.userId)
        .filter(Boolean) as string[];
}

function isSelfStreaming(): boolean {
    try {
        return !!StreamStore?.getCurrentUserActiveStream?.();
    } catch {
        return false;
    }
}

function stopStreaming(): boolean {
    try {
        if (typeof StreamActions?.stopBroadcasting === "function") {
            StreamActions.stopBroadcasting();
            return true;
        }

        if (typeof StreamActions?.toggleSelfBroadcast === "function") {
            StreamActions.toggleSelfBroadcast();
            return true;
        }
    } catch {}

    return false;
}

function startStreaming(): boolean {
    try {
        if (typeof StreamActions?.startBroadcasting === "function") {
            StreamActions.startBroadcasting();
            return true;
        }

        if (typeof StreamActions?.toggleSelfBroadcast === "function") {
            StreamActions.toggleSelfBroadcast();
            return true;
        }
    } catch {}

    return false;
}

function recalculateAndApply() {
    const channelId = getCurrentVoiceChannelId();
    const selfId = getCurrentUserId();

    if (!channelId || !selfId) {
        prevNonWhitelistedCount = 0;
        return;
    }

    const whitelist = getWhitelistSet();
    const members = getVoiceMembers(channelId);

    const nonWhitelistedCount = members.filter(id => id !== selfId && !whitelist.has(id)).length;

    // Было 0 -> стало >0: выключаем стрим
    if (prevNonWhitelistedCount === 0 && nonWhitelistedCount > 0) {
        if (isSelfStreaming() && stopStreaming()) {
            disabledByPlugin = true;
        }
    }

    // Было >0 -> стало 0: включаем обратно, если выключили сами
    if (prevNonWhitelistedCount > 0 && nonWhitelistedCount === 0 && disabledByPlugin) {
        if (startStreaming()) {
            disabledByPlugin = false;
        }
    }

    prevNonWhitelistedCount = nonWhitelistedCount;
}

function onVoiceOrChannelChange() {
    recalculateAndApply();
}

export default definePlugin({
    name: "AutoScreenShareControl",
    description: "Выключает демонстрацию при входе не-whitelist в voice и включает обратно при выходе.",
    authors: [{ name: "GPT-5.3-Codex", id: 0 } as any],
    settings,

    start() {
        FluxDispatcher.subscribe("VOICE_STATE_UPDATES", onVoiceOrChannelChange);
        FluxDispatcher.subscribe("VOICE_STATE_UPDATE", onVoiceOrChannelChange);
        FluxDispatcher.subscribe("CHANNEL_SELECT", onVoiceOrChannelChange);

        disabledByPlugin = false;
        prevNonWhitelistedCount = 0;

        recalculateAndApply();
    },

    stop() {
        FluxDispatcher.unsubscribe("VOICE_STATE_UPDATES", onVoiceOrChannelChange);
        FluxDispatcher.unsubscribe("VOICE_STATE_UPDATE", onVoiceOrChannelChange);
        FluxDispatcher.unsubscribe("CHANNEL_SELECT", onVoiceOrChannelChange);

        disabledByPlugin = false;
        prevNonWhitelistedCount = 0;
    }
});
