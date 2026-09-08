/**
 * Print LAN URLs for accessing Hous from phone/tablet on same Wi-Fi.
 */
import os from 'os';

const webPort = process.env.VITE_PORT || 5173;

function getLanAddresses() {
  const nets = os.networkInterfaces();
  const addresses = [];

  for (const entries of Object.values(nets)) {
    for (const net of entries || []) {
      if (net.family !== 'IPv4' || net.internal) continue;
      if (net.address.startsWith('192.168.') || net.address.startsWith('10.')) {
        addresses.push(net.address);
      }
    }
  }

  return [...new Set(addresses)];
}

const ips = getLanAddresses();

console.log('');
console.log('Local network access (same Wi-Fi):');
if (!ips.length) {
  console.log('  No LAN IPv4 found — check Wi-Fi / Ethernet connection.');
} else {
  for (const ip of ips) {
    console.log(`  App:  http://${ip}:${webPort}`);
    console.log(`  API:  http://${ip}:${webPort}/api/v1/health  (via Vite proxy)`);
  }
}
console.log('');
console.log('On your PC: http://localhost:' + webPort);
console.log('Allow Windows Firewall for Node if other devices cannot connect.');
console.log('');
