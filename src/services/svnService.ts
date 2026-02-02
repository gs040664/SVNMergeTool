export interface MergeRequest {
    sourcePath: string;
    targetPath: string;
    revision: string;
}

export interface MergeResponse {
    success: boolean;
    output: string;
    error?: string;
    conflicts?: string[];
}

const API_BASE_URL = 'http://127.0.0.1:3001/api';

export const svnService = {
    /**
     * 執行真實的 SVN 合併
     */
    async performMerge(request: MergeRequest): Promise<MergeResponse> {
        return this.post('merge', request);
    },

    /**
     * 更新 SVN 工作副本
     */
    async update(path: string): Promise<MergeResponse> {
        return this.post('update', { path });
    },

    /**
     * 還原 SVN 變更
     */
    async revert(path: string): Promise<MergeResponse> {
        return this.post('revert', { path });
    },

    /**
     * 提交 SVN 變更
     */
    async commit(path: string, message: string): Promise<MergeResponse> {
        return this.post('commit', { path, message });
    },

    /**
     * 解決衝突
     */
    async resolve(path: string, file: string, choice: string): Promise<MergeResponse> {
        return this.post('resolve', { path, file, choice });
    },

    /**
     * 獲取工作副本異動狀態
     */
    async getStatus(path: string): Promise<MergeResponse> {
        return this.post('status', { path });
    },

    /**
     * 獲取 SVN 歷史紀錄列表
     */
    async getLogsList(path: string, limit: number = 50): Promise<{ success: boolean; logs: any[]; error?: string }> {
        try {
            const query = new URLSearchParams({ path, limit: limit.toString() }).toString();
            const response = await fetch(`${API_BASE_URL}/logs-list?${query}`);

            if (!response.ok) {
                const text = await response.text();
                let errorDetail = `HTTP ${response.status}`;
                try {
                    const json = JSON.parse(text);
                    if (json.error) errorDetail += `: ${json.error}`;
                } catch (e) { }
                return { success: false, logs: [], error: errorDetail };
            }
            return await response.json();
        } catch (error) {
            return { success: false, logs: [], error: error instanceof Error ? error.message : 'Unknown' };
        }
    },

    /**
     * 獲取合併資訊
     */
    async getMergeInfo(source: string, target: string): Promise<{ success: boolean; revisions: string[]; error?: string }> {
        try {
            const query = new URLSearchParams({ source, target }).toString();
            const response = await fetch(`${API_BASE_URL}/mergeinfo?${query}`);
            if (!response.ok) return { success: false, revisions: [], error: `HTTP ${response.status}` };
            return await response.json();
        } catch (error) {
            return { success: false, revisions: [], error: error instanceof Error ? error.message : 'Unknown' };
        }
    },

    /**
     * 獲取最後一個提交訊息
     */
    async getLastMessage(path: string, revision?: string): Promise<{ success: boolean; message: string }> {
        try {
            const url = new URL(`${API_BASE_URL}/last-message`);
            url.searchParams.append('path', path);
            if (revision) url.searchParams.append('revision', revision);

            const response = await fetch(url.toString());
            const contentType = response.headers.get("content-type");
            if (!response.ok || !contentType || !contentType.includes("application/json")) {
                return { success: false, message: '' };
            }
            return await response.json();
        } catch (error) {
            console.error('Fetch last message failed:', error);
            return { success: false, message: '' };
        }
    },

    /**
     * Helper to perform POST requests with robust JSON parsing
     */
    async post(endpoint: string, body: any): Promise<MergeResponse> {
        try {
            const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            const contentType = response.headers.get("content-type");
            const isJson = contentType && contentType.includes("application/json");

            if (!response.ok) {
                let errorMessage = `HTTP Error: ${response.status}`;
                let output = '';

                if (isJson) {
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.error || errorMessage;
                        output = errorData.output || '';
                    } catch (e) {
                        // 解析 JSON 失敗，維持預設錯誤訊息
                    }
                } else {
                    // 如果不是 JSON，可能是後端沒開或路由錯誤回傳了 HTML
                    errorMessage = `後端 API 解析失敗 (${response.status})。請確認後端 server.cjs 是否正在執行。`;
                }

                return { success: false, output, error: errorMessage };
            }

            if (!isJson) {
                return {
                    success: false,
                    output: '',
                    error: `伺服器未回傳 JSON 格式 (收到 ${contentType})。可能是請求路徑錯誤或伺服器異常。`
                };
            }

            return await response.json();
        } catch (error) {
            console.error(`Request to ${endpoint} failed:`, error);
            return {
                success: false,
                output: '',
                error: error instanceof Error ? error.message : '發生未知錯誤',
            };
        }
    }
};
