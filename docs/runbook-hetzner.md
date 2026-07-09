# Infra Runbook — Hetzner + Cloudflare Tunnel

Manual steps you run yourself, in order. Phases 0–1 are one-time host/DNS setup.
Phase 2 brings the public site live. Everything keeps the box **WireGuard-only**
(no public inbound ports) — the website reaches the internet through an
**outbound** Cloudflare Tunnel.

Legend: 🖐 = manual (dashboard/console) · 💻 = shell on the box (over WireGuard).

---

## Phase 0 — Harden the box

You already have WireGuard + SSH-over-WireGuard. This locks the rest down.

### 0.1 🖐 Hetzner Cloud Firewall (cloud level)

> 🛑 **Read this first — how do you currently reach the box?**
> Today there is **no Hetzner firewall attached**, so *every* listening port is
> public. Your `~/.ssh/config` reaches the box at its **public IP on port 22**
> (`Host dagster-vps → 46.62.168.207`), i.e. SSH is currently over the public
> internet, **not** over WireGuard. So before you lock the firewall down you must
> decide which SSH path survives, or you will lock yourself out. Pick **A** or **B**:

**Option A — keep public SSH (simplest, still safe with key-only auth):**
| Protocol | Port  | Source                | Why |
|----------|-------|-----------------------|-----|
| UDP      | 51820 | `0.0.0.0/0`, `::/0`   | WireGuard |
| TCP      | 22    | *your home IP* `/32`  | SSH (restrict to your IP if it's static; else `0.0.0.0/0`) |
| ICMP     | —     | `0.0.0.0/0`, `::/0`   | ping (optional) |

**Option B — true WireGuard-only SSH (matches the thesis, more locked down):**
First make SSH reachable over WireGuard and prove it, *then* drop public 22:
1. Find the box's WireGuard IP: `ssh dagster-vps 'ip -4 addr show wg0'` (e.g. `10.0.0.1`).
2. Add a second SSH host that targets it, and confirm it works **before** step 3:
   ```
   Host hetzner
       HostName 10.0.0.1          # the wg0 address from step 1
       User rense
       IdentityFile ~/.ssh/ccdroplet
   ```
   Test: `ssh hetzner 'hostname'` (WireGuard must be connected on your laptop).
3. Only once that works, set the firewall to **51820/udp + ICMP only** (no port 22).

| Protocol | Port  | Source              | Why |
|----------|-------|---------------------|-----|
| UDP      | 51820 | `0.0.0.0/0`, `::/0` | WireGuard (carries SSH) |
| ICMP     | —     | `0.0.0.0/0`, `::/0` | ping (optional) |

**Outbound (both options):** leave as "allow all" — cloudflared needs outbound
`443/tcp` + `7844/tcp,udp` to Cloudflare.

> ⚠️ Keep a second SSH session open while you apply the firewall. If the new rules
> are wrong you can still fix them from the open session (or via Hetzner's web
> console) instead of being locked out.

### 0.2 💻 Host firewall (defense in depth)

```bash
sudo apt update && sudo apt install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 51820/udp comment 'WireGuard'
sudo ufw allow in on wg0            # trust the WireGuard interface (SSH, service UIs)
# If you chose Option A above (public SSH), ALSO keep 22 open or you lock yourself out:
sudo ufw allow 22/tcp comment 'SSH (Option A only)'
sudo ufw enable
sudo ufw status verbose
```

> If you chose **Option B** (WireGuard-only SSH), skip the `allow 22/tcp` line —
> `allow in on wg0` already covers SSH over the tunnel.

### 0.3 💻 SSH: keys only

In `/etc/ssh/sshd_config` ensure:
```
PasswordAuthentication no
PermitRootLogin no
```
Then `sudo systemctl restart ssh`. (Keep a second WireGuard SSH session open while
testing so a mistake doesn't lock you out.)

### 0.4 💻 Auto security updates + swap

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades      # choose "Yes"

# 2 GB swap — cheap insurance on a 4 GB box once n8n/CRM/Postgres run
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 0.5 💻 Docker (if not already installed)

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"    # log out/in for this to take effect
docker compose version
```

**Phase 0 done when:** `ufw status` shows deny-incoming + WireGuard allowed, the
Hetzner firewall shows only 51820/ICMP inbound, and `ssh hetzner` still works.

---

## Phase 1 — Domain onto Cloudflare (mijndomein.nl)

### 1.1 🖐 Add the site to Cloudflare
1. Create a free Cloudflare account → **Add a site** → enter your domain.
2. Pick the **Free** plan. Cloudflare scans existing DNS records — check that your
   apex (`@`) and `www` are present (we'll point them at the tunnel in Phase 2).
3. Cloudflare shows **two nameservers**, e.g. `xxx.ns.cloudflare.com`. Copy both.

### 1.2 🖐 Point mijndomein.nl at Cloudflare
1. Log in at **mijndomein.nl** → your domain → **Nameservers / Naamservers**.
2. Switch from "default/mijndomein nameservers" to **custom nameservers**.
3. Enter Cloudflare's two nameservers, remove the old ones, save.
4. Back in Cloudflare, click **Done, check nameservers**. Propagation is usually
   <1 h (can be up to 24 h). You'll get an email when the zone is **Active**.

### 1.3 🖐 TLS / HTTPS settings (once Active)
Cloudflare dashboard → **SSL/TLS**:
- Encryption mode: **Full** (works with the tunnel; no origin cert needed).
- **Edge Certificates** → enable **Always Use HTTPS** and **Automatic HTTPS Rewrites**.
- Optionally enable **HSTS** (do this only once you're sure the site is stable).

### 1.4 🖐 Turn on Zero Trust (for Tunnels)
Dashboard → **Zero Trust** → complete the onboarding (Free plan, no card needed for
the tunnel features). This unlocks **Networks → Tunnels** used in Phase 2.

**Phase 1 done when:** Cloudflare shows the zone **Active** and Zero Trust is enabled.

---

## Phase 2 — Public site live via Tunnel

### 2.1 🖐 Create the tunnel
Zero Trust → **Networks → Tunnels → Create a tunnel** → connector **Cloudflared**:
1. Name it e.g. `hetzner`.
2. On the install screen, **copy the token** — the long string after `--token` in
   the shown command. (You do NOT run that command manually; the container does.)
3. **Public Hostnames → Add a public hostname:**
   - Subdomain: *(blank for apex)* · Domain: `yourdomain.nl`
   - Service: **HTTP** → `caddy:80`
   - (Repeat for `www` if you want it, same service.)

### 2.2 💻 Get the repo + token onto the box
```bash
cd ~ && git clone <your-repo-url> personal-site   # or: git pull if already cloned
cd personal-site/infra
cp .env.example .env
nano .env            # paste TUNNEL_TOKEN=<the token from 2.1>
```

### 2.3 💻 Bring it up
```bash
cd ~/personal-site/infra
docker compose up -d
docker compose ps                 # caddy + cloudflared should be "running"
docker compose logs cloudflared   # look for "Registered tunnel connection"
```

### 2.4 🖐 Verify
- Visit `https://yourdomain.nl` — the site loads over HTTPS (padlock).
- Confirm the padlock cert issuer is Cloudflare.
- Re-check `sudo ufw status` and the Hetzner firewall: **still no 80/443 inbound.**

**Phase 2 done when:** the site is public over HTTPS with zero inbound web ports.

---

## After Phase 2 — where the rest goes (later phases)

- **Deploys:** from your laptop, `./scripts/deploy.sh` (push + pull over WireGuard).
  For content-only changes Caddy serves from disk instantly; add `--docker` if you
  changed anything in `infra/`.
- **Daily data pipeline (Phase 4):** GitHub Actions builds the Parquet and commits
  it; a systemd timer on the box runs `scripts/server-pull.sh` to pick it up (cloud
  runners can't SSH in over WireGuard, so the box pulls). Timer unit comes later.
- **Private services (Phase 5):** n8n / CRM go in a **separate** compose file bound
  to WireGuard/localhost, reached over VPN. If you ever want VPN-free but
  authenticated access, add them as extra public hostnames on the *same* tunnel
  gated by **Cloudflare Access** — still no open ports.
