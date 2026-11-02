document.addEventListener('DOMContentLoaded', () => {
    // --- State Variables ---
    let currentActiveCode = null;
    let selectedModalCase = null;

    // --- DOM Elements ---
    const navTabs = document.querySelectorAll('.nav-tab');
    const viewPanels = document.querySelectorAll('.view-panel');
    const quickExitBtn = document.getElementById('quickExitBtn');
    const brandLogo = document.getElementById('brandLogo');

    // Form elements (Page 1)
    const incidentForm = document.getElementById('incidentForm');
    const complaintTextInput = document.getElementById('complaint_text');
    const incidentLocationInput = document.getElementById('incident_location');
    const incidentDateInput = document.getElementById('incident_date');
    const approxTimeInput = document.getElementById('approx_time');
    const cityInput = document.getElementById('city');
    const districtInput = document.getElementById('district');
    const extraDetailsInput = document.getElementById('extra_details');
    const submitReportBtn = document.getElementById('submitReportBtn');

    // Page 2: Code Generation elements
    const generatedCaseCodeEl = document.getElementById('generatedCaseCode');
    const copyCodeBtn = document.getElementById('copyCodeBtn');
    const copyBtnText = document.getElementById('copyBtnText');
    const downloadReceiptBtn = document.getElementById('downloadReceiptBtn');
    const printReceiptBtn = document.getElementById('printReceiptBtn');
    const trackNowBtn = document.getElementById('trackNowBtn');
    const summaryDistrictEl = document.getElementById('summaryDistrict');
    const summaryCityEl = document.getElementById('summaryCity');
    const summaryDateEl = document.getElementById('summaryDate');
    const summaryTimeEl = document.getElementById('summaryTime');
    const summaryLocationEl = document.getElementById('summaryLocation');

    // Track Case elements
    const trackForm = document.getElementById('trackForm');
    const trackCodeInput = document.getElementById('trackCodeInput');
    const trackLoading = document.getElementById('trackLoading');
    const trackResultContainer = document.getElementById('trackResultContainer');

    // Police Portal elements
    const policeDistrictFilter = document.getElementById('policeDistrictFilter');
    const policeStatusFilter = document.getElementById('policeStatusFilter');
    const policeSearchInput = document.getElementById('policeSearchInput');
    const refreshPoliceBtn = document.getElementById('refreshPoliceBtn');
    const policeCasesTbody = document.getElementById('policeCasesTbody');
    const casesCountBadge = document.getElementById('casesCountBadge');
    const metricTotal = document.getElementById('metricTotal');
    const metricActive = document.getElementById('metricActive');
    const metricNew = document.getElementById('metricNew');
    const metricResolved = document.getElementById('metricResolved');

    // Modal elements
    const caseDetailModal = document.getElementById('caseDetailModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const modalCancelBtn = document.getElementById('modalCancelBtn');
    const modalCaseCode = document.getElementById('modalCaseCode');
    const modalDistrict = document.getElementById('modalDistrict');
    const modalCity = document.getElementById('modalCity');
    const modalDate = document.getElementById('modalDate');
    const modalTime = document.getElementById('modalTime');
    const modalLocation = document.getElementById('modalLocation');
    const modalComplaintText = document.getElementById('modalComplaintText');
    const modalExtraDetails = document.getElementById('modalExtraDetails');
    const modalTimeline = document.getElementById('modalTimeline');
    const policeUpdateForm = document.getElementById('policeUpdateForm');
    const updateStatusSelect = document.getElementById('updateStatusSelect');
    const updatePrioritySelect = document.getElementById('updatePrioritySelect');
    const updateOfficerName = document.getElementById('updateOfficerName');
    const updateOfficialNote = document.getElementById('updateOfficialNote');

    // ================= Quick Exit Feature =================
    function triggerQuickExit() {
        // Clear any form memory
        if (incidentForm) incidentForm.reset();
        if (trackCodeInput) trackCodeInput.value = '';
        // Fast redirect without history trace
        window.location.replace("https://www.google.com");
    }

    if (quickExitBtn) {
        quickExitBtn.addEventListener('click', triggerQuickExit);
    }
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            triggerQuickExit();
        }
    });

    // ================= Tab Navigation =================
    function switchTab(tabId) {
        navTabs.forEach(t => {
            const isTarget = t.getAttribute('data-tab') === tabId;
            t.classList.toggle('active', isTarget);
            t.setAttribute('aria-selected', isTarget ? 'true' : 'false');
        });

        viewPanels.forEach(p => {
            p.classList.remove('active');
        });

        if (tabId === 'report-tab') {
            document.getElementById('report-view').classList.add('active');
        } else if (tabId === 'track-tab') {
            document.getElementById('track-view').classList.add('active');
        } else if (tabId === 'police-tab') {
            document.getElementById('police-view').classList.add('active');
            loadPoliceDistricts();
            loadPoliceCases();
        } else if (tabId === 'success-tab') {
            document.getElementById('code-success-view').classList.add('active');
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            switchTab(tab.getAttribute('data-tab'));
        });
    });

    if (brandLogo) {
        brandLogo.addEventListener('click', () => switchTab('report-tab'));
    }

    // ================= Quick Chips for Timing =================
    document.querySelectorAll('.chip-btn[data-date]').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.getAttribute('data-date');
            const d = new Date();
            if (type === 'yesterday') {
                d.setDate(d.getDate() - 1);
            } else if (type === '2days') {
                d.setDate(d.getDate() - 2);
            }
            incidentDateInput.value = d.toISOString().split('T')[0];
        });
    });

    document.querySelectorAll('.chip-btn[data-time]').forEach(btn => {
        btn.addEventListener('click', () => {
            approxTimeInput.value = btn.getAttribute('data-time');
        });
    });

    // Default incident date to today if empty
    if (incidentDateInput && !incidentDateInput.value) {
        incidentDateInput.value = new Date().toISOString().split('T')[0];
    }

    // ================= Form Submission (Page 1 -> Page 2) =================
    if (incidentForm) {
        incidentForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Basic validation
            const complaintVal = complaintTextInput ? complaintTextInput.value.trim() : '';
            const locationVal = incidentLocationInput.value.trim();
            const dateVal = incidentDateInput.value.trim();
            const timeVal = approxTimeInput.value.trim();
            const cityVal = cityInput.value.trim();
            const districtVal = districtInput.value.trim();
            const extraVal = extraDetailsInput.value.trim();

            if (!locationVal || !dateVal || !timeVal || !cityVal || !districtVal || !complaintVal) {
                alert('Please fill out the incident details, location, and your complaint statement.');
                return;
            }

            // Disable button during submit
            submitReportBtn.disabled = true;
            submitReportBtn.innerHTML = '<span>Lodging Anonymous Complaint...</span>';

            try {
                const response = await fetch('/api/reports', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        complaint_text: complaintVal,
                        incident_location: locationVal,
                        incident_date: dateVal,
                        approx_time: timeVal,
                        city: cityVal,
                        district: districtVal,
                        extra_details: extraVal
                    })
                });

                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.detail || 'Failed to submit complaint.');
                }

                const report = result.data;
                currentActiveCode = report.case_code;

                // Populate Page 2 (Code Generation View)
                generatedCaseCodeEl.textContent = report.case_code;
                summaryDistrictEl.textContent = `${report.district} Police Station`;
                summaryCityEl.textContent = report.city;
                summaryDateEl.textContent = report.incident_date;
                summaryTimeEl.textContent = report.approx_time;
                summaryLocationEl.textContent = report.incident_location;

                // Reset form fields
                incidentForm.reset();

                // Switch to Page 2
                switchTab('success-tab');

            } catch (err) {
                alert(`Error lodging complaint: ${err.message}`);
            } finally {
                submitReportBtn.disabled = false;
                submitReportBtn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                    <span>Submit Complaint Anonymously</span>
                `;
            }
        });
    }

    // ================= Page 2 Actions =================
    if (copyCodeBtn) {
        copyCodeBtn.addEventListener('click', () => {
            const code = generatedCaseCodeEl.textContent;
            navigator.clipboard.writeText(code).then(() => {
                copyBtnText.textContent = 'Copied!';
                copyCodeBtn.classList.add('btn-primary');
                setTimeout(() => {
                    copyBtnText.textContent = 'Copy Code';
                    copyCodeBtn.classList.remove('btn-primary');
                }, 2500);
            }).catch(() => {
                alert(`Your Code: ${code}`);
            });
        });
    }

    if (downloadReceiptBtn) {
        downloadReceiptBtn.addEventListener('click', () => {
            const code = generatedCaseCodeEl.textContent;
            const content = `=====================================================
SAFEVOICE CONFIDENTIAL CASE TOKEN
=====================================================
CASE TRACKING CODE : ${code}
STATION ASSIGNED   : ${summaryDistrictEl.textContent}
CITY               : ${summaryCityEl.textContent}
INCIDENT DATE      : ${summaryDateEl.textContent}
APPROXIMATE TIME   : ${summaryTimeEl.textContent}
INCIDENT LOCATION  : ${summaryLocationEl.textContent}

PRIVACY NOTICE:
This report was lodged with 100% anonymity. No personal
details of the survivor were collected or recorded.

HOW TO CHECK STATUS:
Visit the SafeVoice portal anytime and enter your Unique
Case Code above to check investigation updates or review
official notes from the district police department.
=====================================================`;

            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `SafeVoice_${code}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    if (printReceiptBtn) {
        printReceiptBtn.addEventListener('click', () => {
            window.print();
        });
    }

    if (trackNowBtn) {
        trackNowBtn.addEventListener('click', () => {
            const code = generatedCaseCodeEl.textContent;
            switchTab('track-tab');
            if (trackCodeInput) {
                trackCodeInput.value = code;
                fetchCaseStatus(code);
            }
        });
    }

    // ================= Track Case by Code =================
    if (trackForm) {
        trackForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const code = trackCodeInput.value.trim().toUpperCase();
            if (!code) return;
            fetchCaseStatus(code);
        });
    }

    async function fetchCaseStatus(code) {
        trackLoading.classList.remove('hidden');
        trackResultContainer.classList.add('hidden');
        trackResultContainer.innerHTML = '';

        try {
            const res = await fetch(`/api/reports/${encodeURIComponent(code)}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || 'Case code not recognized.');
            }

            renderCaseTrackingResult(data.data);
        } catch (err) {
            trackResultContainer.innerHTML = `
                <div style="text-align: center; color: var(--danger); padding: 20px;">
                    <p style="font-weight: 700;">⚠️ ${err.message}</p>
                    <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 6px;">
                        Please verify that the unique code was entered accurately (e.g. SV-DIST-XXXXXX).
                    </p>
                </div>
            `;
            trackResultContainer.classList.remove('hidden');
        } finally {
            trackLoading.classList.add('hidden');
        }
    }

    function renderCaseTrackingResult(c) {
        let statusBadgeClass = 'badge-active';
        if (c.status === 'Resolved') statusBadgeClass = 'badge-success';
        if (c.status === 'Registered') statusBadgeClass = 'badge-warning';

        const updatesHtml = c.updates.map(u => `
            <div class="timeline-card">
                <div class="timeline-header">
                    <span>${escapeHtml(u.sender)}</span>
                    <span>${escapeHtml(u.created_at)}</span>
                </div>
                <div class="timeline-msg">${escapeHtml(u.message)}</div>
            </div>
        `).join('');

        trackResultContainer.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;">
                <div>
                    <span class="badge badge-code" style="font-size: 1.1rem; padding: 6px 14px;">${escapeHtml(c.case_code)}</span>
                    <h3 style="margin-top: 8px;">Police Case File — ${escapeHtml(c.district)}</h3>
                </div>
                <div>
                    <span class="badge ${statusBadgeClass}" style="font-size: 0.9rem; padding: 6px 12px;">Status: ${escapeHtml(c.status)}</span>
                </div>
            </div>

            <div class="summary-details-box" style="margin-bottom: 20px;">
                <div class="summary-grid">
                    <div class="summary-item">
                        <span class="summary-label">Assigned Jurisdiction</span>
                        <span class="summary-val">${escapeHtml(c.district)} Police Station</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Assigned Officer / Unit</span>
                        <span class="summary-val">${escapeHtml(c.assigned_officer || 'Pending Assignment')}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Incident Date</span>
                        <span class="summary-val">${escapeHtml(c.incident_date)}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Approximate Time</span>
                        <span class="summary-val">${escapeHtml(c.approx_time)}</span>
                    </div>
                    <div class="summary-item full-span">
                        <span class="summary-label">Incident Location & City</span>
                        <span class="summary-val">${escapeHtml(c.incident_location)}, ${escapeHtml(c.city)}</span>
                    </div>
                </div>
            </div>

            <div style="margin-bottom: 24px;">
                <h4 style="font-size: 0.95rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px;">Official Investigation Timeline & Updates</h4>
                <div class="timeline-flow">
                    ${updatesHtml}
                </div>
            </div>

            <div class="card" style="background: #f8faff; border-color: #c7d2fe; padding: 20px;">
                <h4 style="font-size: 0.95rem; color: #1e1b4b; margin-bottom: 8px;">Confidential Follow-up: Provide More Details Anonymously</h4>
                <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 12px;">
                    Did you remember any extra information (a license plate fragment, clothing item, witness, or landmark)? You can send it directly to the investigating officer here without revealing your identity.
                </p>
                <form id="appendFollowupForm" style="display: flex; flex-direction: column; gap: 10px;">
                    <textarea id="appendNoteText" rows="3" required placeholder="Type extra details to attach to this case..."></textarea>
                    <div style="display: flex; justify-content: flex-end;">
                        <button type="submit" class="btn btn-primary" id="appendSubmitBtn">Attach Additional Details</button>
                    </div>
                </form>
            </div>
        `;

        trackResultContainer.classList.remove('hidden');

        // Handle appending extra details
        const appendForm = document.getElementById('appendFollowupForm');
        if (appendForm) {
            appendForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const noteInput = document.getElementById('appendNoteText');
                const note = noteInput.value.trim();
                if (!note) return;

                const btn = document.getElementById('appendSubmitBtn');
                btn.disabled = true;
                btn.textContent = 'Transmitting...';

                try {
                    const res = await fetch(`/api/reports/${encodeURIComponent(c.case_code)}/append`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: note })
                    });
                    if (!res.ok) throw new Error('Failed to attach details.');
                    // Reload case
                    fetchCaseStatus(c.case_code);
                } catch (err) {
                    alert(err.message);
                    btn.disabled = false;
                    btn.textContent = 'Attach Additional Details';
                }
            });
        }
    }

    // ================= Police Station Portal =================
    async function loadPoliceDistricts() {
        try {
            const res = await fetch('/api/police/districts');
            const data = await res.json();
            if (data.success && data.data) {
                // Populate distinct districts
                const currentVal = policeDistrictFilter.value;
                const existing = new Set(['all', 'Central District', 'North District', 'South District', 'East District', 'West District']);
                data.data.forEach(d => {
                    if (d.district && !existing.has(d.district)) {
                        existing.add(d.district);
                        const opt = document.createElement('option');
                        opt.value = d.district;
                        opt.textContent = `${d.district} Police Station (${d.count} cases)`;
                        policeDistrictFilter.appendChild(opt);
                    }
                });
                policeDistrictFilter.value = currentVal;
            }
        } catch (err) {
            console.error('Error fetching districts:', err);
        }
    }

    async function loadPoliceCases() {
        policeCasesTbody.innerHTML = `
            <tr><td colspan="7" class="empty-state">Fetching cases for selected jurisdiction...</td></tr>
        `;

        const district = policeDistrictFilter.value;
        const status = policeStatusFilter.value;
        const search = policeSearchInput.value.trim();

        const params = new URLSearchParams();
        if (district && district !== 'all') params.append('district', district);
        if (status && status !== 'all') params.append('status', status);
        if (search) params.append('search', search);

        try {
            const res = await fetch(`/api/police/cases?${params.toString()}`);
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error('Failed to load cases');
            }

            const cases = data.data;
            renderPoliceCasesTable(cases);
            updatePoliceMetrics(cases);
        } catch (err) {
            policeCasesTbody.innerHTML = `
                <tr><td colspan="7" class="empty-state" style="color: var(--danger);">Error loading cases: ${err.message}</td></tr>
            `;
        }
    }

    function updatePoliceMetrics(cases) {
        metricTotal.textContent = cases.length;
        metricActive.textContent = cases.filter(c => c.status === 'Active Investigation' || c.status === 'Under Assessment').length;
        metricNew.textContent = cases.filter(c => c.status === 'Registered').length;
        metricResolved.textContent = cases.filter(c => c.status === 'Resolved').length;
        casesCountBadge.textContent = `${cases.length} case${cases.length === 1 ? '' : 's'}`;
    }

    function renderPoliceCasesTable(cases) {
        if (!cases || cases.length === 0) {
            policeCasesTbody.innerHTML = `
                <tr><td colspan="7" class="empty-state">No incident reports found for the selected district filters.</td></tr>
            `;
            return;
        }

        policeCasesTbody.innerHTML = cases.map(c => {
            let statusBadge = 'badge-neutral';
            if (c.status === 'Registered') statusBadge = 'badge-warning';
            if (c.status === 'Active Investigation') statusBadge = 'badge-active';
            if (c.status === 'Resolved') statusBadge = 'badge-success';

            let priorityBadge = 'badge-neutral';
            if (c.priority === 'Critical') priorityBadge = 'badge-urgent';
            if (c.priority === 'Urgent') priorityBadge = 'badge-warning';

            return `
                <tr>
                    <td class="cases-code-cell">${escapeHtml(c.case_code)}</td>
                    <td>
                        <strong>${escapeHtml(c.incident_date)}</strong><br>
                        <span style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(c.approx_time)}</span>
                    </td>
                    <td>
                        <strong>${escapeHtml(c.district)}</strong>
                    </td>
                    <td>
                        <strong>${escapeHtml(c.city)}</strong><br>
                        <span style="font-size: 0.82rem; color: var(--text-secondary);">${escapeHtml(truncate(c.incident_location, 35))}</span>
                    </td>
                    <td><span class="badge ${statusBadge}">${escapeHtml(c.status)}</span></td>
                    <td><span class="badge ${priorityBadge}">${escapeHtml(c.priority || 'Normal')}</span></td>
                    <td>
                        <button class="btn btn-secondary btn-sm open-case-btn" data-code="${escapeHtml(c.case_code)}">
                            Inspect Case
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Attach listeners to "Inspect Case" buttons
        document.querySelectorAll('.open-case-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const code = btn.getAttribute('data-code');
                openCaseModal(code);
            });
        });
    }

    // Filter event listeners
    if (policeDistrictFilter) policeDistrictFilter.addEventListener('change', loadPoliceCases);
    if (policeStatusFilter) policeStatusFilter.addEventListener('change', loadPoliceCases);
    if (refreshPoliceBtn) refreshPoliceBtn.addEventListener('click', loadPoliceCases);
    if (policeSearchInput) {
        let debounceTimer;
        policeSearchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(loadPoliceCases, 350);
        });
    }

    // ================= Police Station Case Detail Modal =================
    async function openCaseModal(code) {
        try {
            const res = await fetch(`/api/reports/${encodeURIComponent(code)}`);
            const data = await res.json();
            if (!res.ok) throw new Error('Could not load case details.');

            const c = data.data;
            selectedModalCase = c;

            modalCaseCode.textContent = c.case_code;
            modalDistrict.textContent = `${c.district} Police Station`;
            modalCity.textContent = c.city;
            modalDate.textContent = c.incident_date;
            modalTime.textContent = c.approx_time;
            modalLocation.textContent = c.incident_location;
            if (modalComplaintText) {
                modalComplaintText.textContent = c.complaint_text || 'No detailed statement recorded.';
            }
            modalExtraDetails.textContent = c.extra_details || 'No additional details provided by survivor.';

            updateStatusSelect.value = c.status;
            updatePrioritySelect.value = c.priority || 'Normal';
            updateOfficerName.value = c.assigned_officer || '';
            updateOfficialNote.value = '';

            renderModalTimeline(c.updates || []);

            caseDetailModal.showModal();
        } catch (err) {
            alert(`Error opening case: ${err.message}`);
        }
    }

    function renderModalTimeline(updates) {
        if (!updates || updates.length === 0) {
            modalTimeline.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">No updates logged yet.</p>';
            return;
        }

        modalTimeline.innerHTML = updates.map(u => `
            <div class="timeline-card">
                <div class="timeline-header">
                    <span>${escapeHtml(u.sender)}</span>
                    <span>${escapeHtml(u.created_at)}</span>
                </div>
                <div class="timeline-msg">${escapeHtml(u.message)}</div>
            </div>
        `).join('');
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', () => caseDetailModal.close());
    if (modalCancelBtn) modalCancelBtn.addEventListener('click', () => caseDetailModal.close());

    if (policeUpdateForm) {
        policeUpdateForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!selectedModalCase) return;

            const saveBtn = document.getElementById('saveStatusBtn');
            saveBtn.disabled = true;
            saveBtn.textContent = 'Transmitting...';

            const payload = {
                status: updateStatusSelect.value,
                priority: updatePrioritySelect.value,
                officer_name: updateOfficerName.value.trim(),
                official_note: updateOfficialNote.value.trim()
            };

            try {
                const res = await fetch(`/api/police/cases/${encodeURIComponent(selectedModalCase.case_code)}/status`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || 'Failed to update status');

                alert('Status and official notice transmitted successfully.');
                caseDetailModal.close();
                loadPoliceCases();
            } catch (err) {
                alert(`Error: ${err.message}`);
            } finally {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Transmit Status Update';
            }
        });
    }

    // ================= Utility Functions =================
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function truncate(str, max) {
        if (!str) return '';
        return str.length > max ? str.substring(0, max) + '...' : str;
    }
});
