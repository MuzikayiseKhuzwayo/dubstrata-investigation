import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

async function main() {
  console.log('Connecting to SSE MCP server at http://localhost:8000/mcp/sse ...');
  
  const transport = new SSEClientTransport(new URL('http://localhost:8000/mcp/sse'));
  const client = new Client(
    {
      name: 'list-sse-tools',
      version: '1.0.0'
    },
    {
      capabilities: {}
    }
  );

  try {
    await client.connect(transport);
    console.log('Successfully connected to SSE MCP server!');
    
    const tools = await client.listTools();
    console.log('Exposed Tools:');
    console.log(JSON.stringify(tools, null, 2));
    
    await transport.close();
  } catch (err: any) {
    console.error('Error connecting to SSE MCP server:', err.message);
  }
}

main().catch(console.error);
