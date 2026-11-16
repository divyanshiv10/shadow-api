import dns from "dns/promises";
import net from "net";

function isPrivateIP(ip) {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    if (parts[0] === 127) return true; // Localhost loopback
    if (parts[0] === 10) return true; // Private 10.x.x.x
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // Private 172.16-31.x.x
    if (parts[0] === 192 && parts[1] === 168) return true; // Private 192.168.x.x
    if (parts[0] === 169 && parts[1] === 254) return true; // Cloud metadata
    if (parts[0] === 0) return true;
  }
  if (net.isIPv6(ip)) {
    if (ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80")) {
      return true;
    }
  }
  return false;
}

export async function validateTargetUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL format. Include http:// or https://");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP and HTTPS protocols are allowed.");
  }

  const hostname = parsed.hostname;
  if (hostname === "localhost" || hostname.endsWith(".local")) {
    throw new Error("Blocked: Localhost targets are not allowed for security.");
  }

  const addresses = await dns.lookup(hostname, { all: true });
  for (const addr of addresses) {
    if (isPrivateIP(addr.address)) {
      throw new Error(`Blocked: Target resolves to restricted private IP (${addr.address}).`);
    }
  }

  return parsed.toString();
}