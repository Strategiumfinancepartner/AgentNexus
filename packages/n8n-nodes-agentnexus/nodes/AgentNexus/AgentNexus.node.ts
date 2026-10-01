import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

const BASE = 'https://agentnexus.app';

export class AgentNexus implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Agent Nexus',
		name: 'agentNexus',
		icon: 'file:agentnexus.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Find health-checked APIs, MCP servers and CLIs by plain-language need',
		defaults: { name: 'Agent Nexus' },
		inputs: ['main'],
		outputs: ['main'],
		usableAsTool: true,
		credentials: [{ name: 'agentNexusApi', required: false }],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Discover', value: 'discover', action: 'Find tools for a need', description: 'Describe a need, get matching callable interfaces with health signals' },
					{ name: 'Get Entry', value: 'getEntry', action: 'Get a registry entry', description: 'Full details of one entry by slug' },
					{ name: 'Get Status', value: 'getStatus', action: 'Get registry reliability status', description: 'Public uptime and health-check totals' },
				],
				default: 'discover',
			},
			{
				displayName: 'Need',
				name: 'need',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'send a transactional email',
				displayOptions: { show: { operation: ['discover'] } },
			},
			{
				displayName: 'Category',
				name: 'category',
				type: 'options',
				options: [
					{ name: 'Any', value: '' },
					{ name: 'API', value: 'api' },
					{ name: 'MCP Server', value: 'mcp' },
					{ name: 'CLI', value: 'cli' },
				],
				default: '',
				displayOptions: { show: { operation: ['discover'] } },
			},
			{
				displayName: 'Minimum Reliability',
				name: 'minReliability',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 100 },
				default: 0,
				displayOptions: { show: { operation: ['discover'] } },
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 20 },
				default: 5,
				description: 'Max number of results to return',
				displayOptions: { show: { operation: ['discover'] } },
			},
			{
				displayName: 'Slug',
				name: 'slug',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'stripe-mcp',
				displayOptions: { show: { operation: ['getEntry'] } },
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const out: INodeExecutionData[] = [];
		let hasKey = false;
		try {
			const creds = await this.getCredentials('agentNexusApi');
			hasKey = Boolean(creds?.apiKey);
		} catch {
			hasKey = false;
		}

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const req: IHttpRequestOptions = { method: 'GET', url: '', json: true, headers: { 'user-agent': 'n8n-nodes-agentnexus/0.1.0' } };
				if (operation === 'discover') {
					const qs: IDataObject = {
						need: this.getNodeParameter('need', i) as string,
						limit: this.getNodeParameter('limit', i) as number,
						min_reliability: this.getNodeParameter('minReliability', i) as number,
					};
					const category = this.getNodeParameter('category', i) as string;
					if (category) qs.category = category;
					req.url = `${BASE}/api/public/discover`;
					req.qs = qs;
				} else if (operation === 'getEntry') {
					const slug = (this.getNodeParameter('slug', i) as string).trim();
					if (!slug) throw new NodeOperationError(this.getNode(), 'Slug is required', { itemIndex: i });
					req.url = `${BASE}/api/public/registry/${encodeURIComponent(slug)}`;
				} else {
					req.url = `${BASE}/api/public/status`;
				}
				const data = hasKey
					? await this.helpers.httpRequestWithAuthentication.call(this, 'agentNexusApi', req)
					: await this.helpers.httpRequest(req);
				out.push({ json: data as IDataObject, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					out.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				if (error instanceof NodeOperationError) throw error;
				throw new NodeApiError(this.getNode(), error as never, { itemIndex: i });
			}
		}
		return [out];
	}
}
