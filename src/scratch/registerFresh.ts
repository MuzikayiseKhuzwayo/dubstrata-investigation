import axios from 'axios';
import crypto from 'crypto';

async function main() {
  const uniqueId = crypto.randomBytes(4).toString('hex');
  const email = `agent-fund-${uniqueId}@dubstrata.org`;
  console.log(`Sending fresh agent registration request for: ${email}`);
  
  const payload = {
    human_email: email,
    organization_name: 'Antigravity Autonomous Fund',
    agent_name: 'antigravity-fund-manager'
  };

  try {
    const response = await axios.post('http://localhost:8000/api/v1/auth/tenant/register', payload);
    console.log('Response Status:', response.status);
    console.log('Response Body:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (err: any) {
    if (err.response) {
      console.error('API Error Response:', err.response.status, err.response.data);
    } else {
      console.error('Registration Transport Error:', err.message);
    }
  }
}

main().catch(console.error);
