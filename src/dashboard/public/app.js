// Client side visualizer controller
document.addEventListener('DOMContentLoaded', () => {
  // Navigation elements
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  // Interactive buttons
  const compileReportBtn = document.getElementById('compile-report-btn');
  const refreshScoutBtn = document.getElementById('refresh-scout-btn');
  const reportModal = document.getElementById('report-modal');
  const closeReportModal = document.getElementById('close-report-modal');
  const reportModalBody = document.getElementById('report-modal-body');
  const reportModalOverlay = document.getElementById('report-modal-overlay');

  const assetModal = document.getElementById('asset-modal');
  const closeAssetModalBtn = document.getElementById('close-asset-modal');
  const assetModalBody = document.getElementById('asset-modal-body');
  const assetModalOverlay = document.getElementById('asset-modal-overlay');
  const assetModalTitle = document.getElementById('asset-modal-title');

  // Realized modal elements
  const realizedModal = document.getElementById('realized-modal');
  const closeRealizedModalBtn = document.getElementById('close-realized-modal');
  const realizedModalBody = document.getElementById('realized-modal-body');
  const realizedModalOverlay = document.getElementById('realized-modal-overlay');

  // Frontend context caching for realized trade details to avoid repeated network calls
  const realizedDetailsCache = {};

  // DOM rendering targets
  const engineStatusText = document.getElementById('engine-status-text');
  const engineStatusBadge = document.getElementById('engine-status-badge');
  const toggleDaemonBtn = document.getElementById('toggle-daemon-btn');
  const metricSimBalance = document.getElementById('metric-sim-balance');
  const metricPositionsCount = document.getElementById('metric-positions-count');
  const metricPositionsValue = document.getElementById('metric-positions-value');
  const metricAuditCount = document.getElementById('metric-audit-count');
  
  const portfolioTbody = document.getElementById('portfolio-tbody');
  const realizedTbody = document.getElementById('realized-tbody');
  const refreshPortfolioBtn = document.getElementById('refresh-portfolio-btn');
  const marketsGridContainer = document.getElementById('markets-grid-container');
  const refreshProjectionsBtn = document.getElementById('refresh-projections-btn');
  const projectionsGridContainer = document.getElementById('projections-grid-container');
  const mandatesContainer = document.getElementById('mandates-container');
  const auditTimelineContainer = document.getElementById('audit-timeline-container');
  const mcpTimelineContainer = document.getElementById('mcp-timeline-container');

  // DOM Elements for B2B Content & Causal Engine (Hoisted to top of scope)
  const subTabButtons = document.querySelectorAll('.sub-tab-btn');
  const subTabContents = document.querySelectorAll('.sub-tab-content');
  const manualInvestigateBtn = document.getElementById('manual-investigate-btn');
  const manualTextInput = document.getElementById('manual-text-input');
  const manualStatusBox = document.getElementById('manual-status-box');
  const manualCausalFact = document.getElementById('manual-causal-fact');
  const manualXOutput = document.getElementById('manual-x-output');
  const manualEmailOutput = document.getElementById('manual-email-output');
  const manualApproveAllBtn = document.getElementById('manual-approve-all-btn');

  const rssFeedsContainer = document.getElementById('rss-feeds-container');
  const refreshRssBtn = document.getElementById('refresh-rss-btn');
  const loadOlderRssBtn = document.getElementById('load-older-rss-btn');
  const runScoutScannerBtn = document.getElementById('run-scout-scanner-btn');
  const aiRecommendationsDeck = document.getElementById('ai-recommendations-deck');

  const xTopicInput = document.getElementById('x-topic-input');
  const generateXBtn = document.getElementById('generate-x-btn');
  const xOutputThread = document.getElementById('x-output-thread');
  const approveXBtn = document.getElementById('approve-x-btn');

  const videoContextInput = document.getElementById('video-context');
  const generateVideoBtn = document.getElementById('generate-video-btn');
  const videoScriptOutput = document.getElementById('video-script-output');
  const approveVideoBtn = document.getElementById('approve-video-btn');

  const assetsTbody = document.getElementById('assets-tbody');
  const refreshAssetsBtn = document.getElementById('refresh-assets-btn');

  // State elements
  let rssLimit = 12;
  let lastGeneratedManualAssets = [];
  let lastGeneratedXAsset = null;
  let lastGeneratedVideoAsset = null;

  // 1. Navigation Tab Switching
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabTarget = btn.getAttribute('data-tab');
      
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(`tab-${tabTarget}`).classList.add('active');
      
      loggerDebug(`Switched to tab: ${tabTarget}`);
    });
  });

  // 2. Fetch API helpers
  async function fetchJSON(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  // Debug logging in UI console
  function loggerDebug(msg) {
    console.log(`[DASHBOARD-DEBUG] ${msg}`);
  }

  // Format currency
  function formatUSD(num) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  }

  // 3. UI Updater functions
  async function updateStatus() {
    try {
      const data = await fetchJSON('/api/status');
      
      // Update top banner
      engineStatusText.textContent = data.engineStatus;
      if (data.daemon) {
        toggleDaemonBtn.style.display = 'block';
        if (data.daemon.isRunning) {
          toggleDaemonBtn.textContent = '⏸️ Pause Daemon';
          engineStatusBadge.className = 'engine-badge simulated'; // green
        } else {
          toggleDaemonBtn.textContent = '▶️ Resume Daemon';
          engineStatusBadge.className = 'engine-badge'; // default neon indigo
        }
      } else {
        toggleDaemonBtn.style.display = 'none';
        if (data.isSimulation) {
          engineStatusBadge.className = 'engine-badge simulated';
        } else {
          engineStatusBadge.className = 'engine-badge live';
        }
      }

      // Update basic cards
      metricSimBalance.textContent = formatUSD(data.balances.simulated);
      metricAuditCount.textContent = data.recentAuditsCount;

      const positions = Object.entries(data.portfolio);
      metricPositionsCount.textContent = positions.length;
      metricPositionsValue.textContent = `Tracking ${data.activeMarketsCount} scouting listings`;

      // Render positions table
      if (positions.length === 0) {
        portfolioTbody.innerHTML = `
          <tr class="empty-state-row">
            <td colspan="8">No positions currently held. Scout markets to evaluate and execute trades.</td>
          </tr>
        `;
      } else {
        portfolioTbody.innerHTML = positions.map(([id, pos]) => {
          const cost = (pos.shares || 0) * (pos.averagePrice || 0);
          const liveVal = pos.currentValue || 0;
          const pnl = liveVal - cost;
          const livePrice = pos.livePrice || pos.averagePrice || 0;
          
          const pnlClass = pnl >= 0 ? 'won' : 'lost';
          const pnlText = `${pnl >= 0 ? '+' : ''}${formatUSD(pnl)}`;

          return `
            <tr>
              <td><strong>${pos.marketQuestion || 'N/A'}</strong></td>
              <td><span class="outcome-badge ${(pos.outcome || 'YES').toLowerCase()}">${pos.outcome || 'YES'}</span></td>
              <td>${pos.shares || 0}</td>
              <td>${formatUSD(pos.averagePrice || 0)}</td>
              <td>${formatUSD(livePrice)}</td>
              <td><strong>${formatUSD(liveVal)}</strong></td>
              <td><strong class="status-badge ${pnlClass}">${pnlText}</strong></td>
              <td>${pos.timestamp ? new Date(pos.timestamp).toLocaleTimeString() : 'N/A'}</td>
            </tr>
          `;
        }).join('');
      }

      // Render Realized Ledger
      const realizedData = await fetchJSON('/api/portfolio/realized');
      if (realizedData.length === 0) {
        realizedTbody.innerHTML = `
          <tr class="empty-state-row">
            <td colspan="7">No settled trade records available. Expirations will automatically settle here.</td>
          </tr>
        `;
      } else {
        realizedTbody.innerHTML = realizedData.map(entry => {
          const netClass = entry.netProfit >= 0 ? 'won' : 'lost';
          const netText = `${entry.netProfit >= 0 ? '+' : ''}${formatUSD(entry.netProfit)}`;
          
          return `
            <tr class="clickable-row" data-market-id="${entry.marketId}" style="cursor: pointer;">
              <td><strong>${entry.marketQuestion}</strong></td>
              <td><span class="outcome-badge ${entry.outcome.toLowerCase()}">${entry.outcome}</span></td>
              <td>${formatUSD(entry.investment)}</td>
              <td>${formatUSD(entry.payout)}</td>
              <td><strong class="status-badge ${netClass}">${netText}</strong></td>
              <td><span class="status-badge ${entry.status.toLowerCase()}">${entry.status}</span></td>
              <td>${new Date(entry.resolvedAt).toLocaleString()}</td>
            </tr>
          `;
        }).join('');

        // Bind row click event listeners
        document.querySelectorAll('#realized-tbody .clickable-row').forEach(row => {
          row.addEventListener('click', () => {
            const marketId = row.getAttribute('data-market-id');
            showRealizedTradeAudit(marketId);
          });
        });
      }

    } catch (err) {
      loggerDebug(`Error loading status: ${err.message}`);
    }
  }

  async function updateMarkets() {
    try {
      const markets = await fetchJSON('/api/markets');
      if (markets.length === 0) {
        marketsGridContainer.innerHTML = `<p class="empty-text">No active markets fetched from Gamma API.</p>`;
        return;
      }

      marketsGridContainer.innerHTML = markets.map(group => {
        if (group.type === 'grouped-weather') {
          const volumeMillions = (group.volume / 1000000).toFixed(2);
          
          // Build rows for each temperature bracket
          const bracketsHtml = group.markets.map(m => {
            const yesPrice = Math.round(parseFloat(m.outcomePrices[0] || '0.5') * 100);
            const noPrice = Math.round(parseFloat(m.outcomePrices[1] || '0.5') * 100);
            return `
              <div class="weather-bracket-row" style="display: flex; align-items: center; justify-content: space-between; padding: 0.6rem 0; border-bottom: 1px solid rgba(255,255,255,0.03);">
                <div style="font-weight: 600; color: #e0e0e0; font-size: 0.9rem; flex: 1;">${m.range}</div>
                <div style="display: flex; gap: 0.5rem; align-items: center; flex: 2; justify-content: flex-end;">
                  <span class="odds-pill yes-pill" style="background: rgba(16, 185, 129, 0.1); color: var(--success-color); padding: 0.25rem 0.6rem; border-radius: 4px; font-size: 0.8rem; font-weight: 600;">YES ${yesPrice}%</span>
                  <span class="odds-pill no-pill" style="background: rgba(239, 68, 68, 0.1); color: var(--danger-color); padding: 0.25rem 0.6rem; border-radius: 4px; font-size: 0.8rem; font-weight: 600;">NO ${noPrice}%</span>
                  <button class="action-btn-primary scout-trade-btn" data-market-id="${m.id}" style="padding: 0.35rem 0.8rem; font-size: 0.75rem; border-radius: 4px; font-weight: 600; min-width: 80px;">
                    ⚡ Trade
                  </button>
                </div>
              </div>
            `;
          }).join('');

          return `
            <div class="market-card-scout weather-grouped-card" style="grid-column: 1 / -1; background: rgba(30, 30, 45, 0.25); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 12px; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2); backdrop-filter: var(--glass-blur);">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.75rem;">
                <div>
                  <span class="market-category" style="background: linear-gradient(135deg, #ec4899, #6366f1); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.7rem; text-transform: uppercase; font-weight: 700; color: #fff;">🌡️ Weather Event Group</span>
                  <h3 class="market-question" style="font-family: var(--font-display); font-size: 1.2rem; font-weight: 700; color: #fff; margin-top: 0.4rem; margin-bottom: 0;">${group.city} Temperature Ranges (${group.date})</h3>
                </div>
                <div class="market-stats" style="display: flex; flex-direction: column; align-items: flex-end; font-size: 0.8rem; color: var(--text-secondary);">
                  <span>Total Vol: $${volumeMillions}M</span>
                  <span>Active Brackets: ${group.markets.length}</span>
                </div>
              </div>
              
              <!-- Probability Curve Visualization -->
              <div class="weather-probability-curve" style="background: rgba(255,255,255,0.015); border: 1px solid rgba(255,255,255,0.03); padding: 1rem; border-radius: 8px;">
                <h4 style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-secondary); margin-top: 0; margin-bottom: 0.75rem; letter-spacing: 0.05em;">📊 Implied Probability Distribution</h4>
                <div style="display: flex; align-items: flex-end; gap: 0.5rem; height: 100px; padding-bottom: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.1);">
                  ${group.markets.map(m => {
                    const pct = Math.round(parseFloat(m.outcomePrices[0] || '0.5') * 100);
                    return `
                      <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.25rem; min-width: 0;">
                        <span style="font-size: 0.7rem; color: #e0e0e0; font-weight: 600;">${pct}%</span>
                        <div style="width: 100%; background: linear-gradient(to top, rgba(99, 102, 241, 0.85), rgba(236, 72, 153, 0.85)); height: ${Math.max(4, pct)}px; border-radius: 3px 3px 0 0; min-height: 4px; box-shadow: 0 0 10px rgba(99, 102, 241, 0.3);"></div>
                        <span style="font-size: 0.65rem; color: var(--text-secondary); text-align: center; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; width: 100%;" title="${m.range}">${m.range}</span>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>

              <!-- Brackets List -->
              <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                ${bracketsHtml}
              </div>
            </div>
          `;
        } else {
          // Standard single market card
          const volumeMillions = (parseInt(group.volume || 0) / 1000000).toFixed(2);
          return `
            <div class="market-card-scout">
              <div>
                <span class="market-category">${group.category || 'N/A'}</span>
                <h3 class="market-question">${group.question || 'N/A'}</h3>
                <div class="odds-display">
                  <div class="odds-option yes-option">
                    <div class="odds-name">${(group.outcomes && group.outcomes[0]) || 'YES'}</div>
                    <div class="odds-percentage">${Math.round(parseFloat((group.outcomePrices && group.outcomePrices[0]) || '0.5') * 100)}%</div>
                  </div>
                  <div class="odds-option no-option">
                    <div class="odds-name">${(group.outcomes && group.outcomes[1]) || 'NO'}</div>
                    <div class="odds-percentage">${Math.round(parseFloat((group.outcomePrices && group.outcomePrices[1]) || '0.5') * 100)}%</div>
                  </div>
                </div>
              </div>
              <div class="market-stats">
                <span>Volume: $${volumeMillions}M</span>
                <span>Expires: ${group.endDate ? new Date(group.endDate).toLocaleDateString() : 'N/A'}</span>
              </div>
              <button class="action-btn-primary scout-trade-btn" data-market-id="${group.id || ''}" style="padding: 0.5rem; font-size: 0.85rem; margin-top: 0.8rem; width: 100%; border-radius: 6px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 0.25rem;">
                ⚡ Analyze &amp; Trade
              </button>
            </div>
          `;
        }
      }).join('');

      // Add click handlers
      const scoutTradeBtns = document.querySelectorAll('.scout-trade-btn');
      scoutTradeBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
          const marketId = btn.getAttribute('data-market-id');
          try {
            btn.disabled = true;
            btn.innerHTML = `⏳ Inquiring Causal Graph...`;
            
            loggerDebug(`Direct analysis requested for market: ${marketId}`);
            const tradeRes = await fetchJSON('/api/scout/analyze-trade', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ marketId })
            });

            if (tradeRes.status === 'HOLD') {
              alert(`🚫 Causal Query Error on Live DB: Evaluated to HOLD to protect capital. Cryptographic ledger receipt committed.`);
            } else {
              alert(`✅ Dynamic Causal Position Executed!\n- Decision: BUY ${tradeRes.decision}\n- Size: $${tradeRes.betAmount}\n- Avg Cost: ${tradeRes.price}\n- TxHash: ${tradeRes.txHash.slice(0, 16)}...`);
            }
            
            await refreshAll();
          } catch (err) {
            alert(`Trade execution failed: ${err.message}`);
          } finally {
            btn.disabled = false;
            btn.innerHTML = `⚡ Analyze &amp; Trade`;
          }
        });
      });
    } catch (err) {
      loggerDebug(`Error loading markets: ${err.message}`);
    }
  }

  async function runAiScanner() {
    if (!runScoutScannerBtn || !aiRecommendationsDeck) return;

    try {
      runScoutScannerBtn.disabled = true;
      runScoutScannerBtn.innerHTML = `⏳ Scanning &amp; Evaluating...`;

      // Render 5 shimmering skeleton cards
      aiRecommendationsDeck.innerHTML = Array(5).fill(0).map(() => `
        <div class="skeleton-card">
          <div class="skeleton-element" style="width: 40%; height: 20px; border-radius: 6px;"></div>
          <div class="skeleton-element" style="width: 80%; height: 24px; margin-top: 1rem;"></div>
          <div class="skeleton-element" style="width: 90%; height: 24px;"></div>
          <div class="skeleton-element" style="width: 100%; height: 80px; margin-top: 1.5rem; border-radius: 10px;"></div>
          <div class="skeleton-element" style="width: 100%; height: 40px; margin-top: 1rem; border-radius: 6px;"></div>
        </div>
      `).join('');

      const recommendations = await fetchJSON('/api/scout/recommendations');

      if (!recommendations || recommendations.length === 0) {
        aiRecommendationsDeck.innerHTML = `
          <div class="empty-state-card" style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; background: rgba(255, 255, 255, 0.02); border: 1px dashed rgba(255, 255, 255, 0.08); border-radius: 12px;">
            <p style="color: var(--text-secondary); font-size: 0.95rem; margin: 0;">
              No active market recommendations returned. Fetch live scout listings and try again.
            </p>
          </div>
        `;
        return;
      }

      aiRecommendationsDeck.innerHTML = recommendations.map(rec => {
        const volumeMillions = (parseInt(rec.volume || 0) / 1000000).toFixed(2);
        const rankText = `#${rec.rank} Opportunity`;
        const rankClass = `rank-${rec.rank}`;
        
        let catClass = 'tech';
        if (rec.category?.toLowerCase().includes('finance') || rec.category?.toLowerCase().includes('rate')) {
          catClass = 'finance';
        } else if (rec.category?.toLowerCase().includes('people') || rec.category?.toLowerCase().includes('politics')) {
          catClass = 'people';
        }

        const yesPrice = Math.round(parseFloat((rec.outcomePrices && rec.outcomePrices[0]) || '0.5') * 100);
        const noPrice = Math.round(parseFloat((rec.outcomePrices && rec.outcomePrices[1]) || '0.5') * 100);

        return `
          <div class="recommendation-card ${rankClass}" style="opacity: 0; transition: opacity 0.5s ease-in-out;">
            <div>
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap;">
                <span class="opportunity-badge ${rankClass}">⚡ ${rankText}</span>
                <span class="category-pill ${catClass}">${rec.category || 'N/A'}</span>
              </div>
              <h4 class="headline-text ${rankClass}">${rec.headline || ''}</h4>
              <h3 class="market-question" style="font-size: 1rem; margin-top: 0.25rem;">${rec.question || 'N/A'}</h3>
              
              <div class="odds-display" style="margin-top: 0.8rem;">
                <div class="odds-option yes-option">
                  <div class="odds-name">${(rec.outcomes && rec.outcomes[0]) || 'YES'}</div>
                  <div class="odds-percentage">${yesPrice}%</div>
                </div>
                <div class="odds-option no-option">
                  <div class="odds-name">${(rec.outcomes && rec.outcomes[1]) || 'NO'}</div>
                  <div class="odds-percentage">${noPrice}%</div>
                </div>
              </div>

              <div class="rationale-block">
                <strong>🧠 AI Evaluation:</strong> ${rec.rationale || 'No evaluation provided.'}
                <div style="margin-top: 0.5rem; font-size: 0.8rem; display: flex; align-items: center; gap: 0.35rem;">
                  <span style="color: var(--text-secondary);">Target Sentiment:</span>
                  <span class="status-badge" style="background: ${rec.sentiment === 'YES' ? 'rgba(16, 185, 129, 0.15)' : rec.sentiment === 'NO' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255, 255, 255, 0.1)'}; color: ${rec.sentiment === 'YES' ? 'var(--success-color)' : rec.sentiment === 'NO' ? 'var(--danger-color)' : 'var(--text-secondary)'}; border: 1px solid ${rec.sentiment === 'YES' ? 'rgba(16, 185, 129, 0.3)' : rec.sentiment === 'NO' ? 'rgba(244, 63, 94, 0.3)' : 'rgba(255, 255, 255, 0.2)'}; padding: 0.1rem 0.4rem; font-size: 0.75rem; border-radius: 4px; font-weight: 700;">${rec.sentiment}</span>
                </div>
              </div>
            </div>
            
            <div class="market-stats" style="margin-top: 0.5rem; display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-secondary);">
              <span>Volume: $${volumeMillions}M</span>
              <span>Expires: ${rec.endDate ? new Date(rec.endDate).toLocaleDateString() : 'N/A'}</span>
            </div>

            <button class="action-btn-primary scout-trade-btn recommendation-trade-btn" data-market-id="${rec.marketId || ''}" style="padding: 0.55rem; font-size: 0.85rem; margin-top: 0.8rem; width: 100%; border-radius: 6px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 0.25rem;">
              ⚡ Analyze &amp; Trade
            </button>
          </div>
        `;
      }).join('');

      // Fade-in animation sequence for cards
      const cards = aiRecommendationsDeck.querySelectorAll('.recommendation-card');
      cards.forEach((card, index) => {
        setTimeout(() => {
          card.style.opacity = '1';
        }, index * 100);
      });

      // Bind click handlers for recommendations trade button
      const recTradeBtns = aiRecommendationsDeck.querySelectorAll('.recommendation-trade-btn');
      recTradeBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
          const marketId = btn.getAttribute('data-market-id');
          try {
            btn.disabled = true;
            btn.innerHTML = `⏳ Inquiring Causal Graph...`;
            
            loggerDebug(`Direct analysis requested from recommendations for market: ${marketId}`);
            const tradeRes = await fetchJSON('/api/scout/analyze-trade', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ marketId })
            });

            if (tradeRes.status === 'HOLD') {
              alert(`🚫 Causal Query Error on Live DB: Evaluated to HOLD to protect capital. Cryptographic ledger receipt committed.`);
            } else {
              alert(`✅ Dynamic Causal Position Executed!\n- Decision: BUY ${tradeRes.decision}\n- Size: $${tradeRes.betAmount}\n- Avg Cost: ${tradeRes.price}\n- TxHash: ${tradeRes.txHash.slice(0, 16)}...`);
            }
            
            await refreshAll();
          } catch (err) {
            alert(`Trade execution failed: ${err.message}`);
          } finally {
            btn.disabled = false;
            btn.innerHTML = `⚡ Analyze &amp; Trade`;
          }
        });
      });

    } catch (err) {
      loggerDebug(`Error running AI scanner: ${err.message}`);
      aiRecommendationsDeck.innerHTML = `
        <div class="empty-state-card" style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; background: rgba(255, 255, 255, 0.02); border: 1px dashed rgba(244, 63, 94, 0.2); border-radius: 12px;">
          <p style="color: var(--danger-color); font-size: 0.95rem; margin: 0;">
            Failed to scan and evaluate listings: ${err.message}
          </p>
        </div>
      `;
    } finally {
      runScoutScannerBtn.disabled = false;
      runScoutScannerBtn.innerHTML = `✨ Run AI Opportunities Scanner`;
    }
  }

  async function updateMandates() {
    try {
      const mandates = await fetchJSON('/api/mandates');
      if (mandates.length === 0) {
        mandatesContainer.innerHTML = `<p class="empty-text">No mandates discovered in harness registry.</p>`;
        return;
      }

      mandatesContainer.innerHTML = mandates.map(m => `
        <div class="mandate-card">
          <div class="card-glow"></div>
          <div class="dashboard-section-header">
            <h3>Agent Mandate Contract: <span style="color: var(--accent-color);">${m.agentId}</span></h3>
            <p>Signer Authority: <strong>${m.signerAddress}</strong></p>
          </div>
          <div class="mandate-grid">
            <div>
              <div class="mandate-stat-label">Max Position Size</div>
              <div class="mandate-stat-val" style="color: var(--accent-color);">${formatUSD(m.maxPositionSize)}</div>
            </div>
            <div>
              <div class="mandate-stat-label">Daily Budget Limit</div>
              <div class="mandate-stat-val" style="color: var(--accent-color);">${formatUSD(m.dailyLimit)}</div>
            </div>
            <div>
              <div class="mandate-stat-label">Authorized Scope</div>
              <div class="mandate-stat-val" style="font-size: 0.95rem; margin-top: 0.25rem;">
                ${m.allowedCategories.map(c => `<span class="outcome-badge" style="margin-right: 0.35rem; background: rgba(255,255,255,0.05); color: var(--text-primary); font-weight: 500;">${c}</span>`).join('')}
              </div>
            </div>
            <div>
              <div class="mandate-stat-label">Contract Status</div>
              <div class="mandate-stat-val secure" style="color: var(--success-color); font-size: 1.15rem; display: flex; align-items: center; gap: 0.35rem;">
                <span class="pulse-dot"></span> ACTIVE COMPLIANT
              </div>
            </div>
          </div>
          <div class="mandate-stat-label" style="margin-bottom: 0.5rem;">EIP-712 Cryptographic Signature Proof</div>
          <div class="signature-block">${m.signature}</div>
        </div>
      `).join('');
    } catch (err) {
      loggerDebug(`Error loading mandates: ${err.message}`);
    }
  }

  async function updateAudits() {
    try {
      const audits = await fetchJSON('/api/audit');
      if (audits.length === 0) {
        auditTimelineContainer.innerHTML = `<p class="empty-text" style="text-align: center; padding: 3rem; color: var(--text-secondary);">Audit trail currently empty. Initiate trades or run a backtest to chain blocks.</p>`;
        return;
      }

      auditTimelineContainer.innerHTML = audits.map((block, index) => {
        let blockClass = '';
        let statusBadge = '';

        if (block.decision === 'BLOCKED_BY_MANDATE') {
          blockClass = 'blocked';
          statusBadge = `<span class="status-badge blocked">BLOCKED BY POLICY</span>`;
        } else if (block.executionStatus === 'SUCCESS') {
          blockClass = block.decision === 'BUY' ? 'won' : '';
          statusBadge = `<span class="status-badge won">SUCCESS (COMPLETED)</span>`;
        } else if (block.executionStatus === 'SIMULATED') {
          statusBadge = `<span class="status-badge" style="background: rgba(99,102,241,0.1); color: var(--accent-color);">SIMULATED STATE</span>`;
        } else {
          blockClass = 'lost';
          statusBadge = `<span class="status-badge lost">${block.executionStatus}</span>`;
        }

        const dateStr = new Date(block.timestamp).toLocaleString();
        
        return `
          <div class="timeline-item ${blockClass}">
            <div class="block-header">
              <div class="block-id">Ledger Block ID: ${block.id}</div>
              <div class="block-meta">
                <span style="font-size: 0.8rem; color: var(--text-secondary);">${dateStr}</span>
                ${statusBadge}
              </div>
            </div>
            
            <h3 class="block-question">${block.intent.marketQuestion}</h3>
            
            <div class="block-body-grid">
              <div>
                <div class="mandate-stat-label">Decision Action</div>
                <div style="font-weight: 700; color: ${block.decision === 'BUY' ? 'var(--success-color)' : (block.decision === 'BLOCKED_BY_MANDATE' ? 'var(--warning-color)' : 'var(--text-secondary)')}">
                  ${block.decision} ${block.decision !== 'HOLD' && block.decision !== 'BLOCKED_BY_MANDATE' ? block.intent.outcomeSelected : ''}
                </div>
              </div>
              <div>
                <div class="mandate-stat-label">Position Investment</div>
                <div>${formatUSD(block.intent.amountUSD)}</div>
              </div>
              <div>
                <div class="mandate-stat-label">Execution Execution Price</div>
                <div>${block.executionPrice ? `${formatUSD(block.executionPrice)}` : 'N/A'}</div>
              </div>
              <div>
                <div class="mandate-stat-label">Dubstrata Causal Probability</div>
                <div style="font-weight: 600; color: var(--accent-color);">${Math.round(block.intent.probabilityLLM * 100)}% vs ${Math.round(block.intent.probabilityImplied * 100)}% Implied</div>
              </div>
            </div>

            <div class="block-reasoning-panel">
              <strong>Dubstrata Graph Reasoning Analysis:</strong><br/>
              ${block.intent.reasoning}
              ${block.blockReason ? `<br/><strong style="color: var(--danger-color);">Block Friction:</strong> ${block.blockReason}` : ''}
            </div>

            <div class="block-chain-proof">
              Verification Cryptographic Chain Hash: ${block.verificationHash}
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      loggerDebug(`Error loading audit trail: ${err.message}`);
    }
  }


  async function updateProjections() {
    try {
      const projections = await fetchJSON('/api/portfolio/projections');
      
      if (!projections || projections.length === 0) {
        projectionsGridContainer.innerHTML = `
          <div class="empty-state-row" style="grid-column: 1 / -1; text-align: center; padding: 3rem; width: 100%;">
            <p class="empty-text">No active positions tracked yet. Execute BUY trades in the Scout tab or Portfolio tab to start tracing.</p>
          </div>
        `;
        return;
      }

      projectionsGridContainer.innerHTML = projections.map(p => {
        const trendClass = (p.trend || 'stable').toLowerCase(); // on_track, stable, at_risk
        const trendLabel = (p.trend || 'stable').replace('_', ' ');
        const pctChance = Math.round((p.winProbability || 0) * 100);
        
        return `
          <div class="projection-card">
            <div>
              <div class="projection-header">
                <h3 class="projection-title">${p.marketQuestion || 'N/A'}</h3>
                <span class="status-pulse-badge ${trendClass}">
                  <span class="pulse-circle"></span>
                  ${trendLabel}
                </span>
              </div>

              <div class="projection-observed">
                📊 Ground-Truth: <strong>${p.observedCausalFact || 'Pending evaluation'}</strong>
              </div>

              <div class="mandate-stat-label">Win Probability Projection: ${pctChance}%</div>
              <div class="probability-bar-container">
                <div class="probability-bar-fill" style="width: ${pctChance}%;"></div>
              </div>

              <div class="projection-stats-row">
                <div class="stat-item">
                  <span class="stat-item-label">Position / Average Cost</span>
                  <span class="stat-item-val" style="font-size: 0.85rem;">
                    BUY <span class="outcome-badge ${(p.outcome || 'YES').toLowerCase()}">${p.outcome || 'YES'}</span> @ ${formatUSD(p.averagePrice || 0)}
                  </span>
                </div>
                <div class="stat-item">
                  <span class="stat-item-label">Shares / Total Cost</span>
                  <span class="stat-item-val" style="font-size: 0.85rem;">
                    ${(p.shares !== undefined && p.shares !== null) ? (typeof p.shares === 'number' ? p.shares : parseFloat(p.shares) || 0).toFixed(2) : '0.00'} (${formatUSD(p.currentCost || 0)})
                  </span>
                </div>
                <div class="stat-item" style="margin-top: 0.5rem;">
                  <span class="stat-item-label">Projected Payout</span>
                  <span class="stat-item-val" style="color: var(--success-color);">${formatUSD(p.expectedPayout || 0)}</span>
                </div>
                <div class="stat-item" style="margin-top: 0.5rem;">
                  <span class="stat-item-label">Projected Net P&amp;L</span>
                  <span class="stat-item-val ${(p.projectedNetProfit || 0) >= 0 ? 'won' : 'lost'}" style="color: ${(p.projectedNetProfit || 0) >= 0 ? 'var(--success-color)' : 'var(--danger-color)'}; font-weight: 700;">
                    ${(p.projectedNetProfit || 0) >= 0 ? '+' : ''}${formatUSD(p.projectedNetProfit || 0)}
                  </span>
                </div>
              </div>
            </div>

            <div class="causal-commentary-box">
              <strong style="color: var(--text-primary); font-size: 0.72rem; display: block; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.03em;">🧠 Agent Causal Projection Commentary</strong>
              ${p.causalCommentary || 'Causal briefing compilation in progress.'}
            </div>
          </div>
        `;
      }).join('');

    } catch (err) {
      loggerDebug(`Error loading projections: ${err.message}`);
    }
  }

  async function updateMcp() {
    try {
      const logs = await fetchJSON('/api/mcp-interactions');
      if (logs.length === 0) {
        mcpTimelineContainer.innerHTML = `<p class="empty-text" style="text-align: center; padding: 3rem; color: var(--text-secondary);">No MCP interactions logged yet. Run queries or start strategy cycles.</p>`;
        return;
      }

      mcpTimelineContainer.innerHTML = logs.map(block => {
        const dateStr = new Date(block.timestamp).toLocaleString();
        const totalEstimatedTokens = block.inputMetrics.estimatedTokens + block.outputMetrics.estimatedTokens;
        
        return `
          <div class="timeline-item" style="border-left-color: var(--accent-color);">
            <div class="block-header">
              <div class="block-id">Tool Transaction: ${block.toolName.toUpperCase()}</div>
              <div class="block-meta">
                <span style="font-size: 0.8rem; color: var(--text-secondary);">${dateStr}</span>
                <span class="status-badge" style="background: rgba(99,102,241,0.1); color: var(--accent-color);">${block.latencyMs}ms Latency</span>
              </div>
            </div>

            <div class="block-body-grid" style="margin-bottom: 0.5rem;">
              <div>
                <div class="mandate-stat-label">Estimated Input Tokens</div>
                <div style="font-weight: 600;">${block.inputMetrics.estimatedTokens} (${block.inputMetrics.characters} chars)</div>
              </div>
              <div>
                <div class="mandate-stat-label">Estimated Output Tokens</div>
                <div style="font-weight: 600;">${block.outputMetrics.estimatedTokens} (${block.outputMetrics.characters} chars)</div>
              </div>
              <div>
                <div class="mandate-stat-label">Total Est. Token Volume</div>
                <div style="font-weight: 700; color: var(--accent-color);">${totalEstimatedTokens} tokens</div>
              </div>
              <div>
                <div class="mandate-stat-label">Ingest Compression Ratio</div>
                <div style="font-weight: 600; color: var(--success-color);">${block.compressionRatio.toFixed(2)}x</div>
              </div>
            </div>

            <div class="block-reasoning-panel" style="background: rgba(255,255,255,0.015); border: 1px solid var(--border-color); font-family: monospace; font-size: 0.8rem; max-height: 250px; overflow-y: auto; white-space: pre-wrap; word-break: break-all;">
              <strong>Inputs:</strong><br/>
              ${JSON.stringify(block.payload.inputs, null, 2)}
              
              <br/><br/><strong>Outputs:</strong><br/>
              ${block.payload.outputs}
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      loggerDebug(`Error loading MCP telemetry: ${err.message}`);
    }
  }

  // 5. Polling Loop
  async function refreshAll() {
    await updateStatus();
    await updateMarkets();
    await updateMandates();
    await updateAudits();
    await updateMcp();
    await updateProjections();
  }

  // Toggle background daemon run-state (pause/resume)
  toggleDaemonBtn.addEventListener('click', async () => {
    try {
      toggleDaemonBtn.disabled = true;
      await fetchJSON('/api/daemon/toggle', { method: 'POST' });
      await updateStatus();
    } catch (err) {
      loggerDebug(`Error toggling daemon: ${err.message}`);
    } finally {
      toggleDaemonBtn.disabled = false;
    }
  });

  // Refresh & settle trades handler
  refreshPortfolioBtn.addEventListener('click', async () => {
    try {
      refreshPortfolioBtn.disabled = true;
      refreshPortfolioBtn.textContent = '⏳ Valuing & Settling...';
      
      const refreshResult = await fetchJSON('/api/portfolio/refresh', { method: 'POST' });
      loggerDebug('Portfolio valued and settled successfully!');

      if (refreshResult.realizedChanges && refreshResult.realizedChanges.length > 0) {
        const winLossSummaries = refreshResult.realizedChanges.map(c => `- "${c.marketQuestion}" resolved: ${c.status} (Profit: ${formatUSD(c.netProfit)})`).join('\n');
        alert(`🎉 Trade Settlements Realized!\n${winLossSummaries}`);
      }

      await refreshAll();
    } catch (err) {
      alert(`Portfolio refresh failed: ${err.message}`);
    } finally {
      refreshPortfolioBtn.disabled = false;
      refreshPortfolioBtn.innerHTML = `🔄 Refresh &amp; Settle Trades`;
    }
  });

  // Refresh projections handler
  refreshProjectionsBtn.addEventListener('click', async () => {
    try {
      refreshProjectionsBtn.disabled = true;
      refreshProjectionsBtn.textContent = '⏳ Querying Causal Graphs...';
      
      await updateProjections();
      loggerDebug('Projections refreshed successfully via Dubstrata MCP!');
    } catch (err) {
      alert(`Projections refresh failed: ${err.message}`);
    } finally {
      refreshProjectionsBtn.disabled = false;
      refreshProjectionsBtn.innerHTML = `🔄 Refresh Causal Projections`;
    }
  });

  // Simple markdown-to-HTML parser for daily reports
  function parseMarkdown(md) {
    let lines = md.split('\n');
    let htmlLines = [];
    let inList = false;
    let inTable = false;
    let tableHtml = '';

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();

      // Table parsing
      if (line.startsWith('|') && line.endsWith('|')) {
        if (!inTable) {
          inTable = true;
          tableHtml = '<table>';
        }
        if (line.includes('---|') || line.includes('--|')) {
          continue; // skip delimiter
        }
        const isHeader = !tableHtml.includes('<th>');
        const cellTag = isHeader ? 'th' : 'td';
        const cells = line.split('|').slice(1, -1).map(c => c.trim());
        tableHtml += '<tr>';
        for (const cell of cells) {
          let cellParsed = cell
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
          tableHtml += `<${cellTag}>${cellParsed}</${cellTag}>`;
        }
        tableHtml += '</tr>';
        continue;
      } else {
        if (inTable) {
          inTable = false;
          tableHtml += '</table>';
          htmlLines.push(tableHtml);
        }
      }

      // Lists
      if (line.startsWith('- ')) {
        if (!inList) {
          inList = true;
          htmlLines.push('<ul>');
        }
        let listContent = line.substring(2)
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/`(.*?)`/g, '<code>$1</code>');
        htmlLines.push(`<li>${listContent}</li>`);
        continue;
      } else {
        if (inList) {
          inList = false;
          htmlLines.push('</ul>');
        }
      }

      // Headers
      if (line.startsWith('# ')) {
        htmlLines.push(`<h1>${line.substring(2)}</h1>`);
      } else if (line.startsWith('## ')) {
        htmlLines.push(`<h2>${line.substring(3)}</h2>`);
      } else if (line.startsWith('### ')) {
        htmlLines.push(`<h3>${line.substring(4)}</h3>`);
      } else if (line === '---') {
        htmlLines.push('<hr/>');
      } else if (line.length === 0) {
        continue;
      } else {
        if (line.startsWith('<div') || line.startsWith('</div') || line.startsWith('<span') || line.startsWith('</span') || line.startsWith('<strong') || line.startsWith('🛡️') || line.startsWith('⚠️')) {
          htmlLines.push(line);
        } else {
          let lineParsed = line
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
          htmlLines.push(`<p>${lineParsed}</p>`);
        }
      }
    }

    if (inTable) {
      tableHtml += '</table>';
      htmlLines.push(tableHtml);
    }
    if (inList) {
      htmlLines.push('</ul>');
    }

    return htmlLines.join('\n');
  }

  // Open daily report modal
  compileReportBtn.addEventListener('click', async () => {
    try {
      compileReportBtn.disabled = true;
      compileReportBtn.textContent = '⏳ Compiling...';
      
      const report = await fetchJSON('/api/portfolio/compile-report', { method: 'POST' });
      loggerDebug('Daily performance report compiled successfully!');
      
      // Parse markdown to HTML and render
      const parsedHTML = parseMarkdown(report.markdownContent);
      reportModalBody.innerHTML = parsedHTML;
      
      // Show modal
      reportModal.classList.remove('hidden');
      document.body.style.overflow = 'hidden'; // Lock background scroll
    } catch (err) {
      alert(`Failed to compile report: ${err.message}`);
    } finally {
      compileReportBtn.disabled = false;
      compileReportBtn.innerHTML = `📊 Compile Daily Report`;
    }
  });

  function hideModal() {
    reportModal.classList.add('hidden');
    document.body.style.overflow = ''; // Unlock scroll
  }

  closeReportModal.addEventListener('click', hideModal);
  reportModalOverlay.addEventListener('click', hideModal);

  function hideAssetModal() {
    assetModal.classList.add('hidden');
    document.body.style.overflow = ''; // Unlock scroll
  }

  closeAssetModalBtn.addEventListener('click', hideAssetModal);
  assetModalOverlay.addEventListener('click', hideAssetModal);

  function hideRealizedModal() {
    realizedModal.classList.add('hidden');
    document.body.style.overflow = ''; // Unlock scroll
  }

  closeRealizedModalBtn.addEventListener('click', hideRealizedModal);
  realizedModalOverlay.addEventListener('click', hideRealizedModal);

  async function showRealizedTradeAudit(marketId) {
    // Show loading overlay
    realizedModalBody.innerHTML = `
      <div style="padding: 3rem; text-align: center; font-family: 'Inter', sans-serif;">
        <div style="margin: 0 auto 1.5rem auto; width: 40px; height: 40px; border: 3px solid rgba(255, 255, 255, 0.05); border-top-color: var(--accent-color); border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <p style="color: var(--text-secondary); font-size: 0.95rem; font-weight: 500;">Scoping local databases and Polymarket Gamma networks...</p>
      </div>
    `;
    realizedModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Lock background scroll

    try {
      let details;
      if (realizedDetailsCache[marketId]) {
        details = realizedDetailsCache[marketId];
      } else {
        details = await fetchJSON(`/api/portfolio/realized/details/${marketId}`);
        realizedDetailsCache[marketId] = details;
      }

      if (!details || !details.ledgerEntry) {
        realizedModalBody.innerHTML = `
          <div style="padding: 2rem; text-align: center; color: var(--danger-color);">
            Failed to resolve trade record details.
          </div>
        `;
        return;
      }

      const entry = details.ledgerEntry;
      const logs = details.auditLogs || [];
      
      const pnlClass = entry.netProfit >= 0 ? 'won' : 'lost';
      const pnlPrefix = entry.netProfit >= 0 ? '+' : '';
      
      let html = `
        <div style="font-family: 'Inter', sans-serif;">
          <div style="margin-bottom: 1.5rem; background: rgba(255, 255, 255, 0.01); border: 1px solid rgba(255, 255, 255, 0.05); padding: 1.25rem; border-radius: 10px;">
            <h2 style="margin: 0 0 0.5rem 0; font-size: 1.25rem; font-weight: 700; line-height: 1.4; color: var(--text-primary); font-family: var(--font-display);">${entry.marketQuestion}</h2>
            <span style="font-size: 0.8rem; color: var(--text-secondary); display: block; word-break: break-all;">
              <strong>Market ID:</strong> <code>${entry.marketId}</code>
            </span>
          </div>
          
          <div class="audit-overview-grid">
            <div class="audit-card">
              <span class="audit-card-label">Investment</span>
              <span class="audit-card-value">${formatUSD(entry.investment)}</span>
            </div>
            <div class="audit-card">
              <span class="audit-card-label">Payout</span>
              <span class="audit-card-value">${formatUSD(entry.payout)}</span>
            </div>
            <div class="audit-card">
              <span class="audit-card-label">Net Profit</span>
              <span class="audit-card-value ${pnlClass}">${pnlPrefix}${formatUSD(entry.netProfit)}</span>
            </div>
            <div class="audit-card">
              <span class="audit-card-label">Result Status</span>
              <span class="audit-card-value"><span class="outcome-badge ${entry.status.toLowerCase()}">${entry.status}</span></span>
            </div>
          </div>

          <h3 style="margin: 2rem 0 1rem 0; color: var(--accent-color); font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;">
            ⛓️ Chronological Trade Lifecycle &amp; Decision Logs
          </h3>
          
          <div class="audit-timeline">
      `;
      
      if (logs.length === 0) {
        html += `
          <div style="padding: 1.5rem; text-align: center; color: var(--text-secondary);">
            No decision/audit history logged for this trade.
          </div>
        `;
      } else {
        logs.forEach(log => {
          const decisionClass = log.decision.toLowerCase();
          let badgeIcon = '📝';
          let decisionTitle = log.decision;
          
          if (log.decision === 'BUY') {
            badgeIcon = '📥';
            decisionTitle = 'Position Buy Executed';
          } else if (log.decision === 'SELL') {
            badgeIcon = '📤';
            decisionTitle = 'Position Resolved / Settled';
          } else if (log.decision === 'HOLD') {
            badgeIcon = '⏳';
            decisionTitle = 'Capital Protected / HOLD Order';
          } else if (log.decision === 'BLOCKED_BY_MANDATE') {
            badgeIcon = '🚫';
            decisionTitle = 'Order Blocked by Mandate Check';
          }
          
          const priceText = log.executionPrice ? `${formatUSD(log.executionPrice)} / share` : 'N/A';
          const sharesText = log.sharesAcquired ? log.sharesAcquired.toLocaleString(undefined, {maximumFractionDigits: 4}) : 'N/A';
          
          html += `
            <div class="timeline-event ${decisionClass}">
              <div class="timeline-badge">${badgeIcon}</div>
              <div class="timeline-content">
                <div class="timeline-event-header">
                  <span class="timeline-event-title">${decisionTitle}</span>
                  <span class="timeline-event-time">${new Date(log.timestamp).toLocaleString()}</span>
                </div>
                
                <!-- Meta parameters -->
                <div class="timeline-event-meta">
                  <div class="meta-field">
                    <span class="meta-label">Execution Status</span>
                    <span class="meta-value" style="color: ${log.executionStatus === 'SUCCESS' || log.executionStatus === 'SIMULATED' ? 'var(--success-color)' : 'var(--danger-color)'}">${log.executionStatus}</span>
                  </div>
                  <div class="meta-field">
                    <span class="meta-label">Price per Share</span>
                    <span class="meta-value">${priceText}</span>
                  </div>
                  <div class="meta-field">
                    <span class="meta-label">Shares Exchanged</span>
                    <span class="meta-value">${sharesText}</span>
                  </div>
                  <div class="meta-field">
                    <span class="meta-label">Mandate Auth</span>
                    <span class="meta-value" style="font-size: 0.75rem; font-family: monospace; word-break: break-all;">${log.mandateHash || 'N/A'}</span>
                  </div>
                </div>
          `;
          
          if (log.blockReason) {
            html += `
              <div style="margin-top: 0.75rem; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); padding: 0.75rem; border-radius: 6px; font-size: 0.85rem; color: var(--text-primary);">
                <strong style="color: var(--danger-color); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.03em; display: block; margin-bottom: 0.2rem;">🚫 Block / Action Reason</strong>
                ${log.blockReason}
              </div>
            `;
          }
          
          // Causal reasoning / RAG block
          if (log.intent && log.intent.reasoning) {
            const reasoningContent = log.intent.reasoning;
            const isHTML = reasoningContent.trim().startsWith('<div') || reasoningContent.includes('style=');
            
            html += `
              <div class="timeline-event-reasoning">
                <strong style="color: var(--accent-color); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.03em; display: block; margin-bottom: 0.25rem;">🔬 Causal Graph Analysis &amp; RAG Reasoning</strong>
                <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.45;">
                  ${isHTML ? reasoningContent : reasoningContent.replace(/\n/g, '<br>')}
                </div>
              </div>
            `;
          }
          
          // Cryptographic integrity block
          if (log.verificationHash) {
            html += `
              <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px dashed rgba(255, 255, 255, 0.05); display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.75rem; color: var(--text-secondary);">
                <div style="display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
                  <span><strong>Verification Signature:</strong> <code style="color: #60a5fa; font-size: 0.75rem; font-family: monospace;">${log.verificationHash}</code></span>
                  <span><strong>Tx Hash:</strong> <code style="color: #34d399; font-size: 0.75rem; font-family: monospace;">${log.transactionHash || 'N/A'}</code></span>
                </div>
              </div>
            `;
          }
          
          html += `
              </div>
            </div>
          `;
        });
      }
      
      html += `
          </div>
        </div>
      `;
      
      realizedModalBody.innerHTML = html;
    } catch (err) {
      realizedModalBody.innerHTML = `
        <div style="padding: 2rem; text-align: center; color: var(--danger-color);">
          Error loading trade details: ${err.message}
        </div>
      `;
    }
  }

  // Fetch live scout listings handler
  refreshScoutBtn.addEventListener('click', async () => {
    try {
      refreshScoutBtn.disabled = true;
      refreshScoutBtn.textContent = '⏳ Fetching Listings...';
      
      await updateMarkets();
      loggerDebug('Polymarket Scout listings loaded successfully!');
    } catch (err) {
      alert(`Scout refresh failed: ${err.message}`);
    } finally {
      refreshScoutBtn.disabled = false;
      refreshScoutBtn.innerHTML = `🔄 Fetch Live Scout Listings`;
    }
  });

  // Run AI Scout Opportunities Scanner handler
  if (runScoutScannerBtn) {
    runScoutScannerBtn.addEventListener('click', async () => {
      await runAiScanner();
    });
  }

  // Refresh live RSS feeds handler
  if (refreshRssBtn) {
    refreshRssBtn.addEventListener('click', async () => {
      try {
        refreshRssBtn.disabled = true;
        refreshRssBtn.textContent = '⏳ Scraping Live RSS Updates...';
        
        await updateRssFeeds(true);
        loggerDebug('Scraped fresh live RSS feeds successfully!');
      } catch (err) {
        alert(`Scrape failed: ${err.message}`);
      } finally {
        refreshRssBtn.disabled = false;
        refreshRssBtn.innerHTML = `🔄 Scrape Live RSS Updates`;
      }
    });
  }

  // Load older RSS feeds handler
  if (loadOlderRssBtn) {
    loadOlderRssBtn.addEventListener('click', async () => {
      try {
        loadOlderRssBtn.disabled = true;
        loadOlderRssBtn.textContent = '⏳ Loading older entries...';
        
        // Increase page size by 12 to load older entries
        rssLimit += 12;
        
        await updateRssFeeds(false);
        loggerDebug(`Expanded RSS feeds view to ${rssLimit} items.`);
      } catch (err) {
        alert(`Failed to load older feeds: ${err.message}`);
      } finally {
        loadOlderRssBtn.disabled = false;
        loadOlderRssBtn.innerHTML = `📜 Load Older RSS Feeds`;
      }
    });
  }

  // Initial load
  refreshAll();

  // Poll status, portfolio, and audits every 5 seconds
  setInterval(() => {
    updateStatus();
    updateAudits();
    updateMcp();
  }, 5000);

  // Poll projections slowly every 2 minutes (120 seconds) to protect API limits
  setInterval(() => {
    updateProjections();
  }, 120000);

  // ==========================================
  // B2B CONTENT GENERATION ENGINE CLIENT CONTROLLER
  // ==========================================

  // Sub tab switching event listeners (selectors hoisted to the top)
  subTabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const subTarget = btn.getAttribute('data-subtab');
      
      subTabButtons.forEach(b => b.classList.remove('active'));
      subTabContents.forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(`subtab-${subTarget}`).classList.add('active');
      
      loggerDebug(`Switched B2B sub-tab to: ${subTarget}`);
      if (subTarget === 'asset-repo') {
        updateContentAssets();
      }
    });
  });

  // (State elements and DOM Elements for B2B Content hoisted to the top of DOMContentLoaded)

  // Load Content Assets from persistence layer
  async function updateContentAssets() {
    try {
      const assets = await fetchJSON('/api/content/assets');
      if (assets.length === 0) {
        assetsTbody.innerHTML = `
          <tr class="empty-state-row">
            <td colspan="9">No copy assets stored in repository yet. Generate and approve some!</td>
          </tr>
        `;
        return;
      }

      const getTweetText = (t) => {
        if (typeof t === 'string') return t;
        if (t && typeof t === 'object') {
          return t.tweet || t.content || t.text || JSON.stringify(t);
        }
        return String(t || '');
      };

      assetsTbody.innerHTML = assets.map(a => {
        const isPending = a.status === 'PENDING_APPROVAL';
        const statusClass = isPending ? 'blocked' : 'won';
        const statusText = isPending ? 'PENDING HITL' : 'PUBLISHED LIVE';
        
        let contentHtml = '';
        if (Array.isArray(a.content)) {
          contentHtml = a.content.map((t, idx) => `[Tweet ${idx+1}]: ${getTweetText(t)}`).join(' | ');
        } else if (a.content && typeof a.content === 'object') {
          contentHtml = getTweetText(a.content);
        } else {
          contentHtml = String(a.content || '');
        }
        if (contentHtml.length > 80) {
          contentHtml = contentHtml.substring(0, 80) + '...';
        }

        const viewButton = `<button class="action-btn-secondary view-asset-btn" data-asset-id="${a.id}" style="padding: 0.35rem 0.65rem; font-size: 0.75rem; border-radius: 4px; font-weight: 600; cursor: pointer; margin-right: 0.35rem;">🔍 View</button>`;

        const actionButton = isPending
          ? `<button class="action-btn-primary approve-asset-action-btn" data-asset-id="${a.id}" style="padding: 0.35rem 0.65rem; font-size: 0.75rem; border-radius: 4px; font-weight: 600; cursor: pointer;">✅ Approve</button>`
          : `<span style="color: var(--success-color); font-size: 0.75rem; font-weight: 600;">✨ Published</span>`;

        const badgeClass = a.type.toLowerCase() === 'x' ? 'x-badge' : (a.type.toLowerCase() === 'video' ? 'video-badge' : 'rss-badge');

        return `
          <tr>
            <td><code style="font-size: 0.75rem;">${a.id}</code></td>
            <td><span class="draft-badge ${badgeClass}">${a.type}</span></td>
            <td><strong>${a.topic || ''}</strong></td>
            <td><span title="${a.title || ''}">${a.title || ''}</span></td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>${a.telemetry?.views || 0}</td>
            <td>${a.telemetry?.clicks || 0}</td>
            <td><strong style="color: var(--success-color);">${a.telemetry?.ctr || 0}%</strong></td>
            <td>
              <div style="display: flex; align-items: center;">
                ${viewButton}
                ${actionButton}
              </div>
            </td>
          </tr>
        `;
      }).join('');

      // Add View Click Handlers
      const viewBtns = document.querySelectorAll('.view-asset-btn');
      viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-asset-id');
          const asset = assets.find(x => x.id === id);
          if (asset) {
            assetModalTitle.innerHTML = `📄 Asset Viewer: ${asset.title}`;
            
            let formattedContent = '';
            if (asset.type === 'X') {
              if (Array.isArray(asset.content)) {
                formattedContent = asset.content.map((t, idx) => {
                  const txt = getTweetText(t);
                  return `
                    <div class="tweet-block" style="margin-bottom: 1rem; border: 1px solid var(--border-color); border-radius: 8px; background: rgba(255,255,255,0.02); text-align: left;">
                      <div class="tweet-header" style="background: rgba(255,255,255,0.03); padding: 0.6rem 0.85rem; border-bottom: 1px solid var(--border-color); font-size: 0.75rem; color: var(--accent-color); font-weight: 600; display: flex; justify-content: space-between;">
                        <span>Tweet ${idx + 1}</span>
                        <span>${txt.length}/280 chars</span>
                      </div>
                      <div class="tweet-body" style="padding: 0.85rem; line-height: 1.5; color: var(--text-primary); text-align: left; font-size: 0.95rem;">${txt}</div>
                    </div>
                  `;
                }).join('');
              } else {
                const txt = getTweetText(asset.content);
                formattedContent = `
                  <div class="tweet-block" style="border: 1px solid var(--border-color); border-radius: 8px; background: rgba(255,255,255,0.02); text-align: left;">
                    <div class="tweet-header" style="background: rgba(255,255,255,0.03); padding: 0.6rem 0.85rem; border-bottom: 1px solid var(--border-color); font-size: 0.75rem; color: var(--accent-color); font-weight: 600; display: flex; justify-content: space-between;">
                      <span>THE PULSE Copy Block</span>
                      <span>${txt.length} chars</span>
                    </div>
                    <div class="tweet-body" style="padding: 0.85rem; line-height: 1.5; color: var(--text-primary); text-align: left; white-space: pre-wrap; font-size: 0.95rem;">${txt}</div>
                  </div>
                `;
              }
            } else if (asset.type === 'RSS') {
              formattedContent = `
                <div style="border: 1px solid var(--border-color); border-radius: 8px; background: rgba(255,255,255,0.02); padding: 1rem; text-align: left;">
                  <h4 style="margin: 0 0 1rem 0; color: var(--accent-color); font-size: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">📧 Cold Email Outreach Pitch</h4>
                  <pre style="white-space: pre-wrap; font-family: inherit; font-size: 0.95rem; line-height: 1.6; color: var(--text-primary); margin: 0; word-break: break-word;">${asset.content}</pre>
                </div>
              `;
            } else if (asset.type === 'Video') {
              // Video script visualization
              const scriptBlocks = asset.content
                .split('\n\n')
                .map(p => {
                  if (p.startsWith('[VISUAL:')) {
                    return `<div class="visual-tag" style="background: rgba(14,165,233,0.07); border-left: 3px solid var(--accent-color); padding: 0.5rem 0.75rem; border-radius: 4px; margin-bottom: 0.6rem; font-size: 0.85rem; color: var(--accent-color); font-family: monospace;">${p}</div>`;
                  } else {
                    let formatted = p.replace(/\[PAUSE\]/g, '<span class="pacing-tag" style="background: rgba(239,68,68,0.15); color: #f87171; padding: 0.1rem 0.35rem; border-radius: 3px; font-size: 0.8rem; font-weight: 600; margin: 0 0.15rem;">[PAUSE]</span>');
                    formatted = formatted.replace(/\[BEAT\]/g, '<span class="pacing-tag" style="background: rgba(245,158,11,0.15); color: #fbbf24; padding: 0.1rem 0.35rem; border-radius: 3px; font-size: 0.8rem; font-weight: 600; margin: 0 0.15rem;">[BEAT]</span>');
                    return `<p style="margin-bottom: 0.75rem; line-height: 1.6; font-size: 0.95rem; color: var(--text-primary); text-align: left;">${formatted}</p>`;
                  }
                })
                .join('\n');
                
              formattedContent = `
                <div style="border: 1px solid var(--border-color); border-radius: 8px; background: rgba(255,255,255,0.02); padding: 1rem;">
                  <h4 style="margin: 0 0 1rem 0; color: var(--accent-color); font-size: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">🎬 7-Step Narrative Script Beat Sheet</h4>
                  <div style="font-family: inherit; font-size: inherit; line-height: 1.5;">${scriptBlocks}</div>
                </div>
              `;
            }
            
            // Add Copy and Close actions at the bottom
            formattedContent += `
              <div style="margin-top: 1.5rem; display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
                <button class="action-btn-secondary" id="modal-copy-btn" style="padding: 0.5rem 1rem; border-radius: 6px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.35rem;">📋 Copy to Clipboard</button>
                <button class="action-btn-primary" id="modal-close-btn" style="padding: 0.5rem 1.25rem; border-radius: 6px; font-weight: 600; cursor: pointer;">Close</button>
              </div>
            `;
            
            assetModalBody.innerHTML = formattedContent;
            
            // Setup Copy and Close actions in the modal
            document.getElementById('modal-close-btn').addEventListener('click', hideAssetModal);
            
            const copyBtn = document.getElementById('modal-copy-btn');
            copyBtn.addEventListener('click', () => {
              let textToCopy = '';
              if (asset.type === 'X') {
                textToCopy = Array.isArray(asset.content) ? asset.content.map(getTweetText).join('\n\n') : getTweetText(asset.content);
              } else {
                textToCopy = asset.content;
              }
              navigator.clipboard.writeText(textToCopy)
                .then(() => {
                  copyBtn.innerHTML = '✅ Copied!';
                  setTimeout(() => { copyBtn.innerHTML = '📋 Copy to Clipboard'; }, 1500);
                })
                .catch(err => {
                  alert('Failed to copy text: ' + err);
                });
            });
            
            // Display modal
            assetModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden'; // Lock scroll
          }
        });
      });

      // Add row click handler to open the modal (except when clicking buttons)
      const rows = assetsTbody.querySelectorAll('tr');
      rows.forEach(row => {
        row.style.cursor = 'pointer';
        row.addEventListener('click', (e) => {
          if (e.target.closest('button') || e.target.closest('span.status-badge') || e.target.closest('.approve-asset-action-btn') || e.target.tagName === 'SPAN') {
            // Let the button click handler do its thing if they clicked a button/status/published element
            if (e.target.className && e.target.className.includes('view-asset-btn')) {
              // Proceed if it is the view btn
            } else {
              return;
            }
          }
          const viewBtn = row.querySelector('.view-asset-btn');
          if (viewBtn) {
            viewBtn.click();
          }
        });
      });

      // Add Approve Click Handlers
      const approveActionBtns = document.querySelectorAll('.approve-asset-action-btn');
      approveActionBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-asset-id');
          try {
            btn.disabled = true;
            btn.innerHTML = '⏳ Saving...';
            
            const approved = await fetchJSON('/api/content/assets/approve', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id })
            });

            alert(`🎉 Asset Approved and Published!\n- Headline: "${approved.title}"\n- Simulated CTR: ${approved.telemetry.ctr}%`);
            await updateContentAssets();
          } catch (err) {
            alert(`Approval failed: ${err.message}`);
          }
        });
      });

    } catch (err) {
      loggerDebug(`Error loading assets: ${err.message}`);
    }
  }

  // Helper to rebind execute trade buttons in a restored/new trace container
  function bindCausalTradeButtons(container) {
    const tradeBtns = container.querySelectorAll('.execute-impact-trade-btn');
    tradeBtns.forEach(tBtn => {
      tBtn.addEventListener('click', async () => {
        const marketId = tBtn.getAttribute('data-market-id');
        try {
          tBtn.disabled = true;
          tBtn.innerHTML = `⏳ Executing Causal Position...`;
          
          loggerDebug(`JIT execute trade from causal impact for market: ${marketId}`);
          const tradeRes = await fetchJSON('/api/scout/analyze-trade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ marketId })
          });

          if (tradeRes.status === 'HOLD') {
            alert(`🚫 Causal Query Error on Live DB: Evaluated to HOLD to protect capital. Cryptographic ledger receipt committed.`);
          } else {
            alert(`✅ Dynamic Causal Position Executed!\n- Decision: BUY ${tradeRes.decision}\n- Size: $${tradeRes.betAmount}\n- Avg Cost: ${tradeRes.price}\n- TxHash: ${tradeRes.txHash.slice(0, 16)}...`);
          }
          
          await refreshAll();
        } catch (err) {
          alert(`Trade execution failed: ${err.message}`);
        } finally {
          tBtn.disabled = false;
          tBtn.innerHTML = `⚡ Execute Causal Position`;
        }
      });
    });
  }

  // Load RSS Feeds
  async function updateRssFeeds(forceRefresh = false) {
    try {
      if (forceRefresh) {
        rssLimit = 12; // Reset limit on force reload
      }
      
      // Capture open trace containers state to preserve them across updates
      const openTraces = {};
      document.querySelectorAll('.rss-impact-container').forEach(c => {
        if (c.style.display === 'block') {
          const feedItemId = c.id.replace('impact-container-', '');
          openTraces[feedItemId] = {
            html: c.innerHTML,
            loaded: c.getAttribute('data-loaded')
          };
        }
      });
      
      const feeds = await fetchJSON(`/api/content/rss-feeds?limit=${rssLimit}&refresh=${forceRefresh ? 'true' : 'false'}`);
      if (feeds.length === 0) {
        rssFeedsContainer.innerHTML = `<p class="empty-text">No target RSS news found.</p>`;
        return;
      }

      rssFeedsContainer.innerHTML = feeds.map(f => {
        let typeLabel = '';
        let badgeClass = '';
        
        if (f.type === 'MONEY') {
          typeLabel = '💰 FINANCE';
          badgeClass = 'rss-badge';
        } else if (f.type === 'PEOPLE') {
          typeLabel = '👥 PEOPLE';
          badgeClass = 'x-badge';
        } else {
          typeLabel = '💻 TECH';
          badgeClass = 'video-badge'; // Distinct neon/blue-pink border class
        }
        
        return `
          <div class="rss-card">
            <div>
              <div class="rss-meta">
                <span class="draft-badge ${badgeClass}">${typeLabel}</span>
                <span class="rss-time">${f.time}</span>
              </div>
              <h4 class="rss-headline">${f.title}</h4>
              <p class="rss-snippet">${f.snippet}</p>
            </div>
            <div style="display: flex; gap: 0.4rem; border-top: 1px solid var(--border-color); padding-top: 0.85rem; flex-wrap: wrap;">
              <button class="action-btn-secondary rss-investigate-btn" data-rss-title="${f.title}" data-rss-snippet="${f.snippet}" style="flex: 1; min-width: 80px; font-size: 0.72rem; padding: 0.5rem 0.25rem; border-radius: 6px; font-weight: 500;">
                🔬 Investigate
              </button>
              <button class="action-btn-primary rss-video-btn" data-rss-title="${f.title}" data-rss-snippet="${f.snippet}" style="flex: 1; min-width: 90px; font-size: 0.72rem; padding: 0.5rem 0.25rem; border-radius: 6px; font-weight: 500;">
                🎬 Create Video
              </button>
              <button class="action-btn-primary rss-impact-btn" data-rss-id="${f.id}" style="flex: 1.2; min-width: 100px; font-size: 0.72rem; padding: 0.5rem 0.25rem; border-radius: 6px; font-weight: 600; background: linear-gradient(135deg, #6366f1, #4f46e5); display: flex; align-items: center; justify-content: center; gap: 0.2rem;">
                🔍 Trace Impact
              </button>
            </div>
            <!-- Expanded Impact Scanner Container -->
            <div class="rss-impact-container" id="impact-container-${f.id}" style="display: none;"></div>
          </div>
        `;
      }).join('');

      // Restore open trace containers
      for (const [feedItemId, state] of Object.entries(openTraces)) {
        const container = document.getElementById(`impact-container-${feedItemId}`);
        const btn = document.querySelector(`.rss-impact-btn[data-rss-id="${feedItemId}"]`);
        if (container) {
          container.style.display = 'block';
          container.innerHTML = state.html;
          if (state.loaded === 'true') {
            container.setAttribute('data-loaded', 'true');
          }
          if (btn) {
            btn.innerHTML = `🔼 Close Trace`;
          }
          // Rebind the JIT execute buttons if they exist
          bindCausalTradeButtons(container);
        }
      }

      // Add RSS Lab handler
      const rssBtns = document.querySelectorAll('.rss-investigate-btn');
      rssBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const title = btn.getAttribute('data-rss-title');
          const snippet = btn.getAttribute('data-rss-snippet');
          
          manualTextInput.value = `${title}\n\n${snippet}`;
          
          // Switch tab to manual-lab
          subTabButtons.forEach(b => b.classList.remove('active'));
          subTabContents.forEach(c => c.classList.remove('active'));
          
          const manualBtn = document.querySelector('.sub-tab-btn[data-subtab="manual-lab"]');
          manualBtn.classList.add('active');
          document.getElementById('subtab-manual-lab').classList.add('active');
          
          // Trigger scroll or focus
          manualTextInput.focus();
        });
      });

      // Add RSS Video handler
      const rssVideoBtns = document.querySelectorAll('.rss-video-btn');
      rssVideoBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const title = btn.getAttribute('data-rss-title');
          const snippet = btn.getAttribute('data-rss-snippet');
          
          videoContextInput.value = `${title}\n\n${snippet}`;
          
          // Switch tab to video-narrative
          subTabButtons.forEach(b => b.classList.remove('active'));
          subTabContents.forEach(c => c.classList.remove('active'));
          
          const videoBtn = document.querySelector('.sub-tab-btn[data-subtab="video-narrative"]');
          videoBtn.classList.add('active');
          document.getElementById('subtab-video-narrative').classList.add('active');
          
          // Trigger click on generate-video-btn programmatically
          generateVideoBtn.click();
        });
      });

      // Add RSS Causal Impact handler
      const rssImpactBtns = document.querySelectorAll('.rss-impact-btn');
      rssImpactBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
          const feedItemId = btn.getAttribute('data-rss-id');
          const container = document.getElementById(`impact-container-${feedItemId}`);
          
          if (!container) return;

          // Toggle visibility
          if (container.style.display === 'block') {
            container.style.display = 'none';
            btn.innerHTML = `🔍 Trace Impact`;
            return;
          }

          container.style.display = 'block';
          btn.innerHTML = `🔼 Close Trace`;

          // If already loaded, do not re-fetch
          if (container.getAttribute('data-loaded') === 'true') {
            return;
          }

          // Show loader progress steps
          container.innerHTML = `
            <div class="impact-step-loader">
              <div class="impact-step-item active" id="step-1-${feedItemId}">
                <div class="impact-step-spinner"></div>
                <span>Consulting Dubstrata Causal Graph...</span>
              </div>
              <div class="impact-step-item" id="step-2-${feedItemId}">
                <div class="impact-step-spinner" style="display:none;"></div>
                <span>Searching active prediction markets...</span>
              </div>
              <div class="impact-step-item" id="step-3-${feedItemId}">
                <div class="impact-step-spinner" style="display:none;"></div>
                <span>Analyzing price history & transition matrices...</span>
              </div>
            </div>
          `;

          try {
            // Update loader step transitions during execution
            setTimeout(() => {
              const s1 = document.getElementById(`step-1-${feedItemId}`);
              const s2 = document.getElementById(`step-2-${feedItemId}`);
              if (s1 && s2) {
                s1.classList.remove('active');
                s1.classList.add('completed');
                s1.querySelector('.impact-step-spinner').style.display = 'none';
                s1.insertAdjacentHTML('afterbegin', '<span style="color:var(--success-color); margin-right: 0.25rem;">✓</span> ');
                s2.classList.add('active');
                s2.querySelector('.impact-step-spinner').style.display = 'inline-block';
              }
            }, 1800);

            setTimeout(() => {
              const s2 = document.getElementById(`step-2-${feedItemId}`);
              const s3 = document.getElementById(`step-3-${feedItemId}`);
              if (s2 && s3) {
                s2.classList.remove('active');
                s2.classList.add('completed');
                s2.querySelector('.impact-step-spinner').style.display = 'none';
                s2.insertAdjacentHTML('afterbegin', '<span style="color:var(--success-color); margin-right: 0.25rem;">✓</span> ');
                s3.classList.add('active');
                s3.querySelector('.impact-step-spinner').style.display = 'inline-block';
              }
            }, 3500);

            const res = await fetchJSON('/api/content/rss/causal-impact', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ feedItemId })
            });

            if (res.error) {
              throw new Error(res.error);
            }

            let marketsHtml = '';
            if (!res.evaluations || res.evaluations.length === 0) {
              marketsHtml = `<p style="color:var(--text-secondary); font-size:0.8rem; margin:0; padding: 0.5rem 0;">No active prediction markets discovered matching causal keywords.</p>`;
            } else {
              marketsHtml = `
                <div class="impact-markets-deck" style="margin-top: 0.5rem;">
                  <strong style="color:var(--text-primary); font-size:0.82rem; display:block; margin-bottom:0.35rem;">Discovered active markets & trade recommendation:</strong>
                  ${res.evaluations.map(m => {
                    const deviationVal = Math.round(m.deviation * 100);
                    const isPositive = deviationVal > 0;
                    const deviationText = isPositive ? `+${deviationVal}%` : `${deviationVal}%`;
                    const devColor = m.signal === 'UNDERVALUED' ? 'var(--success-color)' : m.signal === 'OVERVALUED' ? 'var(--danger-color)' : 'var(--text-secondary)';
                    
                    let signalBadge = `<span class="signal-tag fair">⚖️ FAIR PRICE</span>`;
                    if (m.signal === 'UNDERVALUED') {
                      signalBadge = `<span class="signal-tag undervalued">⚡ BUY YES</span>`;
                    } else if (m.signal === 'OVERVALUED') {
                      signalBadge = `<span class="signal-tag overvalued">⚡ BUY NO</span>`;
                    }

                    const yesOdds = Math.round(parseFloat(m.prices[0] || '0.5') * 100);
                    const modelOdds = Math.round(m.modelProbability * 100);

                    return `
                      <div class="impact-market-row">
                        <div class="impact-market-header">
                          <h5 class="impact-market-question">${m.question}</h5>
                          ${signalBadge}
                        </div>
                        <div class="impact-metrics-bar">
                          <span>Market Odds: <strong>${yesOdds}%</strong></span>
                          <span>Model Projections: <strong>${modelOdds}%</strong></span>
                          <span>Deviation: <strong style="color:${devColor};">${deviationText}</strong></span>
                        </div>
                        <button class="action-btn-primary execute-impact-trade-btn" data-market-id="${m.marketId}" style="padding: 0.35rem; font-size: 0.75rem; width: 100%; border-radius: 5px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 0.2rem;">
                          ⚡ Execute Causal Position
                        </button>
                      </div>
                    `;
                  }).join('')}
                </div>
              `;
            }

            container.innerHTML = `
              <div class="causal-brief-box">
                <strong>🔗 Causal Graph Briefing:</strong>
                <p style="margin-top: 0.25rem; margin-bottom: 0; font-size:0.8rem; line-height:1.45;">${res.causalChain || 'No causal relationships traced.'}</p>
              </div>
              ${marketsHtml}
            `;

            container.setAttribute('data-loaded', 'true');

            // Bind execute trade handlers
            bindCausalTradeButtons(container);

          } catch (err) {
            container.innerHTML = `
              <div style="padding: 1rem; color: var(--danger-color); border: 1px dashed rgba(244, 63, 94, 0.2); border-radius: 8px; font-size: 0.8rem;">
                ❌ Tracing failed: ${err.message}
              </div>
            `;
            container.removeAttribute('data-loaded');
            btn.innerHTML = `🔍 Trace Impact`;
          }
        });
      });

    } catch (err) {
      loggerDebug(`Error loading RSS feeds: ${err.message}`);
    }
  }

  // Action: JIT Manual Investigation Lab
  manualInvestigateBtn.addEventListener('click', async () => {
    const text = manualTextInput.value.trim();
    if (!text) {
      alert('Please paste some tech news snippet to investigate.');
      return;
    }

    try {
      manualInvestigateBtn.disabled = true;
      manualInvestigateBtn.innerHTML = '⏳ AI Extraction &amp; Dubstrata RAG Scan...';
      
      const res = await fetchJSON('/api/content/investigate-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      // Show proof box
      manualStatusBox.classList.remove('hidden');
      manualCausalFact.innerHTML = `
        <span style="color: var(--accent-color); font-weight: 600;">Entity Target:</span> ${res.company} (${res.detail})<br/>
        <span style="color: var(--success-color); font-weight: 600;">Verification Proof:</span> ${res.causalFact}
        ${res.isPending ? '<br/><strong style="color: var(--warning-color);">⚠️ Crawler JIT backoff activated. Live indexes generated.</strong>' : ''}
      `;

      // Render X.com Pulse Copy Block
      const xAsset = res.generatedAssets.find(a => a.type === 'X');
      if (xAsset) {
        if (Array.isArray(xAsset.content)) {
          manualXOutput.innerHTML = xAsset.content.map((tweet, idx) => `
            <div class="tweet-block">
              <div class="tweet-header">
                <span>Tweet ${idx + 1}</span>
                <span class="tweet-char-count">${tweet.length}/280 chars</span>
              </div>
              <div class="tweet-body">${tweet}</div>
            </div>
          `).join('');
        } else {
          manualXOutput.innerHTML = `
            <div class="tweet-block">
              <div class="tweet-header">
                <span>THE PULSE Copy Block</span>
                <span class="tweet-char-count">${xAsset.content.length} chars</span>
              </div>
              <div class="tweet-body" style="white-space: pre-wrap; font-family: inherit; line-height: 1.5; text-align: left;">${xAsset.content}</div>
            </div>
          `;
        }
      }

      // Render B2B outreach Cold Email
      const emailAsset = res.generatedAssets.find(a => a.type === 'RSS');
      if (emailAsset) {
        manualEmailOutput.innerHTML = `<pre style="font-family: inherit; font-size: inherit; white-space: pre-wrap; word-break: break-all; margin: 0; color: var(--text-primary);">${emailAsset.content}</pre>`;
      }

      lastGeneratedManualAssets = res.generatedAssets;
      manualApproveAllBtn.classList.remove('hidden');

    } catch (err) {
      alert(`Lab investigation failed: ${err.message}`);
    } finally {
      manualInvestigateBtn.disabled = false;
      manualInvestigateBtn.innerHTML = '🔬 Extract &amp; Investigate JIT';
    }
  });

  // Action: Approve Lab Drafts
  manualApproveAllBtn.addEventListener('click', async () => {
    if (lastGeneratedManualAssets.length === 0) return;
    
    try {
      manualApproveAllBtn.disabled = true;
      manualApproveAllBtn.innerHTML = '⏳ Committing approvals to Repository...';

      for (const asset of lastGeneratedManualAssets) {
        await fetchJSON('/api/content/assets/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: asset.id })
        });
      }

      alert('✅ Successfully approved and published BOTH assets! Telemetry loops generated.');
      manualApproveAllBtn.classList.add('hidden');
      
      // Navigate to repository
      subTabButtons.forEach(b => b.classList.remove('active'));
      subTabContents.forEach(c => c.classList.remove('active'));
      
      const repoBtn = document.querySelector('.sub-tab-btn[data-subtab="asset-repo"]');
      repoBtn.classList.add('active');
      document.getElementById('subtab-asset-repo').classList.add('active');
      
      await updateContentAssets();

      // Automatically open the modal for the first approved asset
      if (lastGeneratedManualAssets.length > 0) {
        const targetId = lastGeneratedManualAssets[0].id;
        setTimeout(() => {
          const viewBtn = document.querySelector(`.view-asset-btn[data-asset-id="${targetId}"]`);
          if (viewBtn) {
            viewBtn.click();
          }
        }, 100);
      }
    } catch (err) {
      alert(`Approval error: ${err.message}`);
    } finally {
      manualApproveAllBtn.disabled = false;
      manualApproveAllBtn.innerHTML = '✅ Approve and Commit Both Drafts to Repository';
    }
  });

  // Action: Formulate X.com Thread
  generateXBtn.addEventListener('click', async () => {
    const topic = xTopicInput.value.trim();
    if (!topic) {
      alert('Please specify a technical topic.');
      return;
    }

    try {
      generateXBtn.disabled = true;
      generateXBtn.innerHTML = '⏳ Querying Dubstrata &amp; Structuring...';
      
      const res = await fetchJSON('/api/content/generate-x', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic })
      });

      const asset = res.asset;
      if (Array.isArray(asset.content)) {
        xOutputThread.innerHTML = asset.content.map((tweet, idx) => `
          <div class="tweet-block">
            <div class="tweet-header">
              <span>Tweet ${idx + 1}</span>
              <span class="tweet-char-count">${tweet.length}/280 chars</span>
            </div>
            <div class="tweet-body">${tweet}</div>
          </div>
        `).join('');
      } else {
        xOutputThread.innerHTML = `
          <div class="tweet-block">
            <div class="tweet-header">
              <span>THE PULSE Copy Block</span>
              <span class="tweet-char-count">${asset.content.length} chars</span>
            </div>
            <div class="tweet-body" style="white-space: pre-wrap; font-family: inherit; line-height: 1.5; text-align: left;">${asset.content}</div>
          </div>
        `;
      }

      lastGeneratedXAsset = asset;
      approveXBtn.classList.remove('hidden');

      if (res.isPending) {
        alert('⏳ Live context for this topic is currently being collected in the backend. Thread formulated with structural parameters and pending collection.');
      }
    } catch (err) {
      alert(`Generation failed: ${err.message}`);
    } finally {
      generateXBtn.disabled = false;
      generateXBtn.innerHTML = '⚡ Formulate Viral Pulse Thread';
    }
  });

  // Action: Approve X Thread
  approveXBtn.addEventListener('click', async () => {
    if (!lastGeneratedXAsset) return;
    try {
      approveXBtn.disabled = true;
      approveXBtn.innerHTML = '⏳ Approving...';
      
      await fetchJSON('/api/content/assets/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: lastGeneratedXAsset.id })
      });

      alert('✅ Thread successfully published to the persistent Asset Repository.');
      approveXBtn.classList.add('hidden');
      xTopicInput.value = '';
      
      // Navigate to repository
      subTabButtons.forEach(b => b.classList.remove('active'));
      subTabContents.forEach(c => c.classList.remove('active'));
      
      const repoBtn = document.querySelector('.sub-tab-btn[data-subtab="asset-repo"]');
      repoBtn.classList.add('active');
      document.getElementById('subtab-asset-repo').classList.add('active');
      
      await updateContentAssets();

      // Automatically open the modal for this asset
      const targetId = lastGeneratedXAsset.id;
      setTimeout(() => {
        const viewBtn = document.querySelector(`.view-asset-btn[data-asset-id="${targetId}"]`);
        if (viewBtn) {
          viewBtn.click();
        }
      }, 100);
    } catch (err) {
      alert(`Approval failed: ${err.message}`);
    } finally {
      approveXBtn.disabled = false;
      approveXBtn.innerHTML = '✅ Approve &amp; Save Draft to Repository';
    }
  });

  // Action: Synthesize Video Script
  generateVideoBtn.addEventListener('click', async () => {
    const context = videoContextInput.value.trim();
    if (!context) {
      alert('Please specify a video context or news snippet.');
      return;
    }

    try {
      generateVideoBtn.disabled = true;
      generateVideoBtn.innerHTML = '⏳ Mapping 7-Step Narrative Engine...';

      const res = await fetchJSON('/api/content/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context })
      });

      const asset = res.asset;
      
      // Format script output with nice styled tags
      const formattedScript = asset.content
        .split('\n\n')
        .map(p => {
          if (p.startsWith('[VISUAL:')) {
            return `<div class="visual-tag">${p}</div>`;
          } else {
            // Highlight BEAT/PAUSE pacing
            let formatted = p.replace(/\[PAUSE\]/g, '<span class="pacing-tag">[PAUSE]</span>');
            formatted = formatted.replace(/\[BEAT\]/g, '<span class="pacing-tag">[BEAT]</span>');
            return `<p style="margin-bottom: 0.75rem; line-height: 1.5;">${formatted}</p>`;
          }
        })
        .join('\n');

      videoScriptOutput.innerHTML = `<div style="font-family: inherit; font-size: inherit;">${formattedScript}</div>`;
      lastGeneratedVideoAsset = asset;
      approveVideoBtn.classList.remove('hidden');

    } catch (err) {
      alert(`Video synthesis failed: ${err.message}`);
    } finally {
      generateVideoBtn.disabled = false;
      generateVideoBtn.innerHTML = '🎬 Synthesize Video Script';
    }
  });

  // Action: Approve Video Script
  approveVideoBtn.addEventListener('click', async () => {
    if (!lastGeneratedVideoAsset) return;
    try {
      approveVideoBtn.disabled = true;
      approveVideoBtn.innerHTML = '⏳ Approving...';

      await fetchJSON('/api/content/assets/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: lastGeneratedVideoAsset.id })
      });

      alert('✅ Video script successfully approved and saved.');
      approveVideoBtn.classList.add('hidden');
      
      // Clear fields
      videoContextInput.value = '';

      // Navigate to repository
      subTabButtons.forEach(b => b.classList.remove('active'));
      subTabContents.forEach(c => c.classList.remove('active'));
      
      const repoBtn = document.querySelector('.sub-tab-btn[data-subtab="asset-repo"]');
      repoBtn.classList.add('active');
      document.getElementById('subtab-asset-repo').classList.add('active');
      
      await updateContentAssets();

      // Automatically open the modal for this asset
      const targetId = lastGeneratedVideoAsset.id;
      setTimeout(() => {
        const viewBtn = document.querySelector(`.view-asset-btn[data-asset-id="${targetId}"]`);
        if (viewBtn) {
          viewBtn.click();
        }
      }, 100);
    } catch (err) {
      alert(`Approval failed: ${err.message}`);
    } finally {
      approveVideoBtn.disabled = false;
      approveVideoBtn.innerHTML = '✅ Approve &amp; Save Video Script';
    }
  });

  // ==========================================
  // CAUSAL INTELLIGENCE BRIEFINGS & RAG FEEDBACK CONTROLLER
  // ==========================================
  const intelQueryInput = document.getElementById('intel-query-input');
  const intelDomainInput = document.getElementById('intel-domain-input');
  const intelCompileBtn = document.getElementById('intel-compile-btn');
  const intelReportOutput = document.getElementById('intel-report-output');
  
  const ragFeedbackBox = document.getElementById('rag-feedback-box');
  const feedbackStarBtns = document.querySelectorAll('.feedback-star-btn');
  const feedbackReasonGroup = document.getElementById('feedback-reason-group');
  const feedbackReasonInput = document.getElementById('feedback-reason-input');
  const feedbackSubmitBtn = document.getElementById('feedback-submit-btn');
  const feedbackSuccessMsg = document.getElementById('feedback-success-msg');

  let lastGeneratedIntelLogId = null;
  let currentConsensusScore = 0;

  // Handle quick-query suggested buttons
  document.querySelectorAll('.quick-query-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.getAttribute('data-query');
      if (q && intelQueryInput) {
        intelQueryInput.value = q;
        intelCompileBtn.click();
      }
    });
  });

  intelCompileBtn.addEventListener('click', async () => {
    const query = intelQueryInput.value.trim();
    if (!query) {
      alert('Please specify a research topic or investment thesis query.');
      return;
    }

    try {
      intelCompileBtn.disabled = true;
      intelCompileBtn.innerHTML = '⏳ Compiling Causal Graph Report...';
      intelReportOutput.innerHTML = '<p class="placeholder-text">⏳ Performing multi-layer vector similarity matching and graph traversal. Running advanced causal RAG reasoning via Gemini 2.5...</p>';
      
      ragFeedbackBox.classList.add('hidden');
      feedbackReasonGroup.classList.add('hidden');
      feedbackSuccessMsg.classList.add('hidden');
      
      const res = await fetchJSON('/api/content/compile-intel-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, domain: intelDomainInput.value.trim() })
      });

      // Parse and format markdown to HTML
      const parsedHTML = parseMarkdown(res.report);
      intelReportOutput.innerHTML = parsedHTML;

      // Update feedback state
      lastGeneratedIntelLogId = res.logId;
      currentConsensusScore = 0;
      
      // Reset stars active class
      feedbackStarBtns.forEach(btn => {
        btn.classList.remove('active');
        btn.style.borderColor = 'rgba(255,255,255,0.1)';
        btn.style.background = 'transparent';
      });

      // Reveal RAG consensus feedback panel
      ragFeedbackBox.classList.remove('hidden');
      loggerDebug(`Deep Causal Briefing successfully compiled! Log ID: ${res.logId}`);

    } catch (err) {
      intelReportOutput.innerHTML = `<p class="placeholder-text" style="color: var(--danger-color);">Briefing compilation failed: ${err.message}</p>`;
      alert(`Report compilation failed: ${err.message}`);
    } finally {
      intelCompileBtn.disabled = false;
      intelCompileBtn.innerHTML = '📊 Compile Deep Intelligence Report';
    }
  });

  // Grading consensus stars trigger
  feedbackStarBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const score = parseInt(btn.getAttribute('data-score'));
      currentConsensusScore = score;
      
      // Highlight stars up to selected score
      feedbackStarBtns.forEach(b => {
        const s = parseInt(b.getAttribute('data-score'));
        if (s <= score) {
          b.style.borderColor = 'var(--accent-color)';
          b.style.background = 'rgba(99, 102, 241, 0.15)';
          b.style.color = 'var(--accent-color)';
        } else {
          b.style.borderColor = 'rgba(255,255,255,0.1)';
          b.style.background = 'transparent';
          b.style.color = 'var(--text-secondary)';
        }
      });
      
      feedbackReasonGroup.classList.remove('hidden');
      feedbackSuccessMsg.classList.add('hidden');
    });
  });

  // Feedback Consensus submission
  feedbackSubmitBtn.addEventListener('click', async () => {
    if (!lastGeneratedIntelLogId || currentConsensusScore === 0) return;
    
    try {
      feedbackSubmitBtn.disabled = true;
      feedbackSubmitBtn.innerHTML = '⏳ Submitting consensus weight...';
      
      const reason = feedbackReasonInput.value.trim();
      const res = await fetchJSON('/api/content/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logId: lastGeneratedIntelLogId,
          score: currentConsensusScore,
          reason
        })
      });

      feedbackSuccessMsg.innerHTML = `✅ Consensus grading successfully committed! Dubstrata CDN node weights adjusted.`;
      feedbackSuccessMsg.classList.remove('hidden');
      feedbackReasonGroup.classList.add('hidden');
      feedbackReasonInput.value = '';
    } catch (err) {
      alert(`Consensus grade commit failed: ${err.message}`);
    } finally {
      feedbackSubmitBtn.disabled = false;
      feedbackSubmitBtn.innerHTML = 'Submit Consensus Grade';
    }
  });

  // Action: Refresh Asset Repository Table
  refreshAssetsBtn.addEventListener('click', async () => {
    try {
      refreshAssetsBtn.disabled = true;
      refreshAssetsBtn.innerHTML = '⏳ Refreshing...';
      await updateContentAssets();
    } finally {
      refreshAssetsBtn.disabled = false;
      refreshAssetsBtn.innerHTML = '🔄 Refresh Table';
    }
  });

  // Initial Content Engine setup
  updateRssFeeds();
  updateContentAssets();

  // Periodically refresh RSS feeds (every 300 seconds / 5 minutes)
  setInterval(() => {
    if (document.getElementById('tab-content-engine').classList.contains('active')) {
      updateRssFeeds();
    }
  }, 300000);
});
