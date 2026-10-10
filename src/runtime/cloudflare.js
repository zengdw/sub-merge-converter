import { CloudflareKVAdapter } from '../adapters/kv/cloudflareKv.js';
import { MergeSubService } from '../services/mergeSubService.js';

export function createCloudflareRuntime(env) {
    const kv = env?.SUBLINK_KV ? new CloudflareKVAdapter(env.SUBLINK_KV) : null;
    const mergeSub = new MergeSubService({
        kv,
        defaultUsername: env?.AUTH_USERNAME || env?.USERNAME || 'admin',
        defaultPassword: env?.AUTH_PASSWORD || env?.PASSWORD || 'admin',
        subToken: env?.SUB_TOKEN || undefined,
        apiUrl: env?.API_URL || '',
        logger: console
    });

    return {
        kv,
        mergeSub,
        assetFetcher: env?.ASSETS ? (request) => env.ASSETS.fetch(request) : null,
        logger: console,
        config: {}
    };
}
