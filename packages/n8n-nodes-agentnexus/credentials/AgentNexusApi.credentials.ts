import type { Icon, IAuthenticateGeneric, ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class AgentNexusApi implements ICredentialType {
	name = 'agentNexusApi';
	displayName = 'Agent Nexus API';
	icon: Icon = 'file:agentnexus.svg';
	documentationUrl = 'https://agentnexus.app/connect';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Free key (1,000 calls/day, no account): POST https://agentnexus.app/api/public/keys',
		},
	];
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: { headers: { 'x-api-key': '={{$credentials.apiKey}}' } },
	};
	test: ICredentialTestRequest = {
		request: { baseURL: 'https://agentnexus.app', url: '/api/public/discover', qs: { need: 'send an email', limit: 1 } },
	};
}
