/* =========================================================
   WBCMS - COMPLETE REAL-TIME NOTIFICATION ENGINE
   Role-Based Client & Staff Notifications, Live Toasts,
   Seen / Unseen State Sections, and Project Decision Details
========================================================= */

(function () {
    "use strict";

    let notificationsList = [];
    let currentFilter = "unseen"; // "unseen" | "seen" | "all"
    let isPanelOpen = false;
    let knownNotificationIds = new Set();
    let isInitialLoad = true;
    let pollIntervalId = null;

    function getAuthToken() {
        return localStorage.getItem("wbcms_token");
    }

    function getAuthHeaders() {
        const token = getAuthToken();
        return {
            "Content-Type": "application/json",
            "Authorization": token ? ("Bearer " + token) : ""
        };
    }

    function getCurrentRole() {
        return (localStorage.getItem("wbcms_role") || "").toUpperCase();
    }

    function isClientUser() {
        const role = getCurrentRole();
        const userType = (localStorage.getItem("wbcms_user_type") || "").toUpperCase();
        return role === "CLIENT" || userType === "CLIENT" || window.location.pathname.includes("client");
    }

    // =========================================================
    // CSS INJECTION: STYLES FOR BELL, DROPDOWN, TOASTS & MODAL
    // =========================================================
    function injectStyles() {
        if (document.getElementById("wbcmsNotifEngineStyles")) return;

        const styleEl = document.createElement("style");
        styleEl.id = "wbcmsNotifEngineStyles";
        styleEl.textContent = `
            /* Circular Notification Bell Button */
            .notification-button, #clientNotifBell, #notifBellBtn {
                position: relative !important;
                cursor: pointer !important;
                width: 42px !important;
                height: 42px !important;
                border-radius: 50% !important;
                background: #ffffff !important;
                border: 1.5px solid #e2e8f0 !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                color: #334155 !important;
                box-shadow: 0 2px 6px rgba(0,0,0,0.04) !important;
                transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
            }

            .notification-button i, #clientNotifBell i, #notifBellBtn i {
                font-size: 18px !important;
                color: #334155 !important;
                transition: color 0.2s ease !important;
            }

            .notification-button:hover, #clientNotifBell:hover, #notifBellBtn:hover {
                border-color: #cbd5e1 !important;
                background: #f8fafc !important;
                transform: translateY(-1px) !important;
                box-shadow: 0 4px 12px rgba(0,0,0,0.08) !important;
            }

            [data-theme="dark"] .notification-button,
            [data-theme="dark"] #clientNotifBell,
            [data-theme="dark"] #notifBellBtn {
                background: #1e293b !important;
                border-color: #334155 !important;
                color: #f1f5f9 !important;
            }
            [data-theme="dark"] .notification-button i,
            [data-theme="dark"] #clientNotifBell i,
            [data-theme="dark"] #notifBellBtn i {
                color: #f1f5f9 !important;
            }

            /* Red circular notification dot/badge with pulse */
            .notification-badge {
                position: absolute !important;
                top: 2px !important;
                right: 2px !important;
                background: #ef4444 !important;
                color: #ffffff !important;
                font-size: 10px !important;
                font-weight: 800 !important;
                min-width: 14px !important;
                height: 14px !important;
                border-radius: 50% !important;
                display: none;
                align-items: center !important;
                justify-content: center !important;
                padding: 0 !important;
                border: 2px solid #ffffff !important;
                box-shadow: 0 0 8px rgba(239, 68, 68, 0.75) !important;
                animation: pulse-notif-badge 2s infinite ease-in-out;
                pointer-events: none;
                line-height: 1;
                z-index: 20;
            }

            .notification-badge.with-count {
                min-width: 19px !important;
                height: 19px !important;
                padding: 0 5px !important;
                border-radius: 999px !important;
                top: -1px !important;
                right: -1px !important;
                font-size: 10.5px !important;
            }

            [data-theme="dark"] .notification-badge {
                border-color: #1e293b !important;
            }

            .notification-badge.active {
                display: inline-flex !important;
            }

            @keyframes pulse-notif-badge {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.14); box-shadow: 0 0 12px rgba(239, 68, 68, 0.95); }
            }

            /* Notification Dropdown Panel */
            .notification-dropdown {
                position: absolute;
                top: 52px;
                right: 0;
                width: 430px;
                max-width: calc(100vw - 20px);
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 18px;
                box-shadow: 0 25px 60px -10px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(226, 232, 240, 0.85);
                z-index: 9999;
                display: none;
                flex-direction: column;
                overflow: hidden;
                animation: notifSlideDown 0.22s cubic-bezier(0.16, 1, 0.3, 1);
                font-family: 'Inter', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }

            [data-theme="dark"] .notification-dropdown {
                background: #0d1629;
                border-color: rgba(255, 255, 255, 0.15);
                box-shadow: 0 25px 60px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.08);
            }

            .notification-dropdown.open {
                display: flex;
            }

            @keyframes notifSlideDown {
                from { opacity: 0; transform: translateY(-8px) scale(0.98); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }

            .notif-header {
                padding: 16px 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 1px solid #f1f5f9;
                background: #ffffff;
            }

            [data-theme="dark"] .notif-header {
                border-bottom-color: rgba(255, 255, 255, 0.08);
                background: rgba(255, 255, 255, 0.03);
            }

            .notif-header h4 {
                margin: 0;
                font-size: 15px;
                font-weight: 800;
                color: #0f172a;
                display: flex;
                align-items: center;
                gap: 8px;
                letter-spacing: -0.2px;
            }

            [data-theme="dark"] .notif-header h4 {
                color: #ffffff;
            }

            .notif-unread-count-pill {
                background: #fef2f2;
                border: 1px solid #fecaca;
                color: #dc2626;
                font-size: 10.5px;
                font-weight: 800;
                padding: 2px 8px;
                border-radius: 999px;
                letter-spacing: 0.02em;
            }

            [data-theme="dark"] .notif-unread-count-pill {
                background: rgba(239, 68, 68, 0.2);
                border-color: rgba(239, 68, 68, 0.45);
                color: #f87171;
            }

            .notif-mark-all-btn {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                color: #334155;
                font-size: 11.5px;
                font-weight: 600;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 5px;
                padding: 5px 11px;
                border-radius: 8px;
                transition: all 0.15s ease;
            }

            .notif-mark-all-btn:hover {
                background: #fee2e2;
                border-color: #fca5a5;
                color: #dc2626;
            }

            [data-theme="dark"] .notif-mark-all-btn {
                background: rgba(255, 255, 255, 0.06);
                border-color: rgba(255, 255, 255, 0.1);
                color: #e2e8f0;
            }

            [data-theme="dark"] .notif-mark-all-btn:hover {
                background: rgba(239, 68, 68, 0.15);
                border-color: rgba(239, 68, 68, 0.35);
                color: #fca5a5;
            }

            /* Unseen and Seen Tabs */
            .notif-tabs {
                display: flex;
                border-bottom: 1px solid #e2e8f0;
                padding: 8px 14px;
                gap: 6px;
                background: #f8fafc;
            }

            [data-theme="dark"] .notif-tabs {
                border-bottom-color: rgba(255, 255, 255, 0.08);
                background: rgba(9, 16, 32, 0.7);
            }

            .notif-tab {
                background: none;
                border: 1px solid transparent;
                color: #64748b;
                font-size: 12px;
                font-weight: 600;
                padding: 6px 13px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.15s ease;
                display: inline-flex;
                align-items: center;
                gap: 6px;
            }

            .notif-tab:hover {
                color: #0f172a;
                background: #e2e8f0;
            }

            .notif-tab.active {
                background: #ffffff;
                color: #0f172a;
                box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
                border-color: #cbd5e1;
                font-weight: 700;
            }

            [data-theme="dark"] .notif-tab {
                color: #94a3b8;
            }

            [data-theme="dark"] .notif-tab:hover {
                color: #f8fafc;
                background: rgba(255, 255, 255, 0.04);
            }

            [data-theme="dark"] .notif-tab.active {
                background: rgba(255, 255, 255, 0.12);
                border-color: transparent;
                color: #ffffff;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }

            .notif-tab-count {
                font-size: 10px;
                padding: 1px 7px;
                border-radius: 10px;
                background: #e2e8f0;
                color: #475569;
                font-weight: 700;
            }

            .notif-tab.active .notif-tab-count {
                background: #eff6ff;
                color: #1d4ed8;
            }

            [data-theme="dark"] .notif-tab-count {
                background: rgba(255, 255, 255, 0.1);
                color: inherit;
            }

            [data-theme="dark"] .notif-tab.active .notif-tab-count {
                background: rgba(255, 255, 255, 0.22);
                color: #ffffff;
            }

            .notif-list {
                max-height: 420px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                background: #ffffff;
            }

            [data-theme="dark"] .notif-list {
                background: #0d1629;
            }

            .notif-list::-webkit-scrollbar {
                width: 6px;
            }
            .notif-list::-webkit-scrollbar-track {
                background: #f8fafc;
            }
            .notif-list::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 4px;
            }

            /* Section Separator when viewing 'All' */
            .notif-section-header {
                padding: 8px 18px;
                background: #f1f5f9;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: #475569;
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 1px solid #e2e8f0;
            }

            [data-theme="dark"] .notif-section-header {
                background: rgba(255, 255, 255, 0.05);
                color: #94a3b8;
                border-bottom-color: rgba(255, 255, 255, 0.08);
            }

            .notif-item {
                padding: 14px 18px;
                border-bottom: 1px solid #f1f5f9;
                display: flex;
                align-items: flex-start;
                gap: 13px;
                cursor: pointer;
                transition: all 0.15s ease;
                position: relative;
                background: #ffffff;
            }

            .notif-item:hover {
                background: #f8fafc;
            }

            .notif-item.unseen {
                background: #fffcf6;
                border-left: 3.5px solid #ea580c;
            }

            .notif-item.unseen:hover {
                background: #fff7ed;
            }

            .notif-item.seen {
                opacity: 0.88;
                border-left: 3.5px solid transparent;
            }

            [data-theme="dark"] .notif-item {
                background: transparent;
                border-bottom-color: rgba(255, 255, 255, 0.06);
            }

            [data-theme="dark"] .notif-item:hover {
                background: rgba(255, 255, 255, 0.04);
            }

            [data-theme="dark"] .notif-item.unseen {
                background: rgba(239, 68, 68, 0.05);
                border-left: 3px solid #ef4444;
            }

            .notif-item.border-approved {
                border-left: 3.5px solid #10b981 !important;
            }

            .notif-item.border-rejected {
                border-left: 3.5px solid #ef4444 !important;
            }

            .notif-item.border-pending {
                border-left: 3.5px solid #f59e0b !important;
            }

            .notif-icon-box {
                width: 36px;
                height: 36px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                flex-shrink: 0;
                margin-top: 2px;
            }

            .notif-icon-box.project-req {
                background: #eff6ff;
                color: #2563eb;
                border: 1px solid #bfdbfe;
            }

            .notif-icon-box.project-req-approved {
                background: #ecfdf5;
                color: #059669;
                border: 1px solid #a7f3d0;
            }

            .notif-icon-box.project-req-rejected {
                background: #fef2f2;
                color: #dc2626;
                border: 1px solid #fecaca;
            }

            .notif-icon-box.project-req-pending {
                background: #fffbeb;
                color: #d97706;
                border: 1px solid #fde68a;
            }

            .notif-icon-box.task {
                background: #f0fdf4;
                color: #16a34a;
                border: 1px solid #bbf7d0;
            }

            .notif-icon-box.material {
                background: #fffbeb;
                color: #d97706;
                border: 1px solid #fde68a;
            }

            .notif-icon-box.system {
                background: #f8fafc;
                color: #475569;
                border: 1px solid #e2e8f0;
            }

            [data-theme="dark"] .notif-icon-box.project-req {
                background: rgba(59, 130, 246, 0.18);
                color: #60a5fa;
                border-color: rgba(59, 130, 246, 0.35);
            }
            [data-theme="dark"] .notif-icon-box.project-req-approved {
                background: rgba(16, 185, 129, 0.18);
                color: #34d399;
                border-color: rgba(16, 185, 129, 0.35);
            }
            [data-theme="dark"] .notif-icon-box.project-req-rejected {
                background: rgba(239, 68, 68, 0.18);
                color: #f87171;
                border-color: rgba(239, 68, 68, 0.35);
            }
            [data-theme="dark"] .notif-icon-box.system {
                background: rgba(255, 255, 255, 0.08);
                color: #cbd5e1;
                border-color: rgba(255, 255, 255, 0.15);
            }

            .notif-content {
                flex: 1;
                min-width: 0;
            }

            .notif-item-top {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                margin-bottom: 4px;
            }

            .notif-title-wrap {
                display: flex;
                align-items: center;
                gap: 7px;
                flex-wrap: wrap;
            }

            .notif-title {
                font-size: 13.5px;
                font-weight: 600;
                color: #1e293b;
                line-height: 1.35;
            }

            .notif-item.unseen .notif-title {
                color: #0f172a;
                font-weight: 700;
            }

            [data-theme="dark"] .notif-title {
                color: #f1f5f9;
            }
            [data-theme="dark"] .notif-item.unseen .notif-title {
                color: #ffffff;
            }

            .notif-request-status-pill {
                font-size: 10px;
                font-weight: 800;
                padding: 2px 8px;
                border-radius: 999px;
                display: inline-flex;
                align-items: center;
                gap: 4px;
                letter-spacing: 0.03em;
                text-transform: uppercase;
                line-height: 1.4;
            }

            .notif-request-status-pill.status-approved {
                background: #ecfdf5;
                color: #059669;
                border: 1px solid #a7f3d0;
            }

            .notif-request-status-pill.status-rejected {
                background: #fef2f2;
                color: #dc2626;
                border: 1px solid #fecaca;
            }

            .notif-request-status-pill.status-pending {
                background: #fffbeb;
                color: #d97706;
                border: 1px solid #fde68a;
            }

            .notif-unseen-tag {
                background: #fef2f2;
                color: #dc2626;
                font-size: 9.5px;
                font-weight: 800;
                padding: 2.5px 8px;
                border-radius: 999px;
                border: 1px solid #fecaca;
                text-transform: uppercase;
                letter-spacing: 0.04em;
                display: inline-flex;
                align-items: center;
                gap: 4px;
                flex-shrink: 0;
            }

            [data-theme="dark"] .notif-unseen-tag {
                background: rgba(239, 68, 68, 0.22);
                color: #fca5a5;
                border-color: rgba(239, 68, 68, 0.4);
            }

            .notif-seen-tag {
                color: #94a3b8;
                font-size: 10px;
                font-weight: 600;
                display: inline-flex;
                align-items: center;
                gap: 3px;
                flex-shrink: 0;
            }

            .notif-desc {
                font-size: 12.5px;
                color: #64748b;
                line-height: 1.5;
                margin: 0 0 8px 0;
                word-break: break-word;
            }

            .notif-item.unseen .notif-desc {
                color: #334155;
            }

            [data-theme="dark"] .notif-desc {
                color: #94a3b8;
            }
            [data-theme="dark"] .notif-item.unseen .notif-desc {
                color: #cbd5e1;
            }

            .notif-item-bottom {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                margin-top: 4px;
            }

            .notif-time {
                font-size: 11px;
                color: #94a3b8;
                display: flex;
                align-items: center;
                gap: 4px;
                font-weight: 500;
            }

            .notif-actions-inline {
                display: inline-flex;
                align-items: center;
                gap: 6px;
            }

            .notif-view-req-btn {
                background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
                color: #ffffff;
                border: none;
                padding: 4px 11px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 700;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 4px;
                box-shadow: 0 2px 6px rgba(37,99,235,0.25);
                transition: all 0.15s ease;
            }

            .notif-view-req-btn:hover {
                background: #1e40af;
                transform: translateY(-1px);
            }

            .notif-toggle-seen-btn {
                background: #f1f5f9;
                border: 1px solid #e2e8f0;
                color: #475569;
                padding: 3px 8px;
                border-radius: 6px;
                font-size: 10.5px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.15s ease;
            }

            .notif-toggle-seen-btn:hover {
                background: #e2e8f0;
                color: #0f172a;
                border-color: #cbd5e1;
            }

            [data-theme="dark"] .notif-toggle-seen-btn {
                background: rgba(255, 255, 255, 0.07);
                border-color: rgba(255, 255, 255, 0.12);
                color: #cbd5e1;
            }

            .notif-empty {
                padding: 42px 20px;
                text-align: center;
                color: #64748b;
            }

            .notif-empty i {
                font-size: 32px;
                color: #94a3b8;
                display: block;
                margin-bottom: 8px;
            }

            .notif-footer {
                padding: 12px 18px;
                border-top: 1px solid #f1f5f9;
                background: #f8fafc;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            [data-theme="dark"] .notif-footer {
                border-top-color: rgba(255, 255, 255, 0.06);
                background: rgba(255, 255, 255, 0.02);
            }

            .notif-footer span {
                font-size: 11.5px;
                color: #64748b;
                font-weight: 600;
                display: inline-flex;
                align-items: center;
                gap: 5px;
            }

            .notif-clear-btn {
                background: none;
                border: none;
                color: #64748b;
                font-size: 11.5px;
                font-weight: 600;
                cursor: pointer;
                padding: 3px 8px;
                border-radius: 4px;
                transition: all 0.15s ease;
            }

            .notif-clear-btn:hover {
                color: #ef4444;
                background: #fee2e2;
            }

            /* TOAST CONTAINER & TOAST NOTIFICATION CARDS */
            #wbcmsNotificationToastContainer {
                position: fixed;
                top: 24px;
                right: 24px;
                z-index: 100000;
                display: flex;
                flex-direction: column;
                gap: 12px;
                pointer-events: none;
                max-width: 400px;
                width: calc(100vw - 32px);
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }

            .wbcms-toast-card {
                pointer-events: auto;
                background: #ffffff;
                border-radius: 14px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 16px 36px rgba(15, 23, 42, 0.16), 0 2px 8px rgba(0,0,0,0.06);
                padding: 14px 16px;
                display: flex;
                align-items: flex-start;
                gap: 12px;
                position: relative;
                overflow: hidden;
                transform: translateX(110%);
                opacity: 0;
                transition: all 0.32s cubic-bezier(0.16, 1, 0.3, 1);
            }

            .wbcms-toast-card.show {
                transform: translateX(0);
                opacity: 1;
            }

            .wbcms-toast-card.hide {
                transform: translateX(110%);
                opacity: 0;
            }

            .wbcms-toast-card.toast-approved {
                border-left: 5px solid #10b981;
            }
            .wbcms-toast-card.toast-rejected {
                border-left: 5px solid #ef4444;
            }
            .wbcms-toast-card.toast-request {
                border-left: 5px solid #2563eb;
            }
            .wbcms-toast-card.toast-system {
                border-left: 5px solid #f59e0b;
            }

            [data-theme="dark"] .wbcms-toast-card {
                background: #0f172a;
                border-color: #334155;
                box-shadow: 0 20px 45px rgba(0, 0, 0, 0.7);
            }

            .wbcms-toast-icon {
                width: 38px;
                height: 38px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                flex-shrink: 0;
            }

            .wbcms-toast-body {
                flex: 1;
                min-width: 0;
            }

            .wbcms-toast-top {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 3px;
            }

            .wbcms-toast-label {
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: #64748b;
            }

            .wbcms-toast-close {
                background: none;
                border: none;
                color: #94a3b8;
                font-size: 18px;
                cursor: pointer;
                padding: 0;
                line-height: 1;
                transition: color 0.15s ease;
            }

            .wbcms-toast-close:hover {
                color: #0f172a;
            }

            .wbcms-toast-title {
                font-size: 13.5px;
                font-weight: 700;
                color: #0f172a;
                margin-bottom: 3px;
                line-height: 1.3;
            }

            [data-theme="dark"] .wbcms-toast-title {
                color: #f8fafc;
            }

            .wbcms-toast-msg {
                font-size: 12px;
                color: #475569;
                line-height: 1.45;
                margin-bottom: 8px;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }

            [data-theme="dark"] .wbcms-toast-msg {
                color: #94a3b8;
            }

            .wbcms-toast-action-btn {
                background: #2563eb;
                color: #ffffff;
                border: none;
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 700;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 4px;
            }

            /* CLIENT PROJECT REQUEST DETAILS MODAL */
            .notif-modal-overlay {
                position: fixed;
                inset: 0;
                background: rgba(15, 23, 42, 0.7);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                z-index: 100002;
                display: none;
                align-items: center;
                justify-content: center;
                padding: 20px;
                animation: fadeIn 0.2s ease-out;
            }
            .notif-modal-overlay.open {
                display: flex;
            }

            .notif-modal-card {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 18px;
                width: 600px;
                max-width: 100%;
                box-shadow: 0 25px 60px rgba(15, 23, 42, 0.25);
                overflow: hidden;
                animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            }

            [data-theme="dark"] .notif-modal-card {
                background: #0f172a;
                border-color: #334155;
                box-shadow: 0 25px 60px rgba(0,0,0,0.65);
            }

            .notif-modal-header {
                padding: 18px 24px;
                background: #f8fafc;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            [data-theme="dark"] .notif-modal-header {
                background: #1e293b;
                border-color: #334155;
            }

            .notif-modal-header h3 {
                margin: 0;
                font-size: 16px;
                font-weight: 800;
                color: #0f172a;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            [data-theme="dark"] .notif-modal-header h3 {
                color: #ffffff;
            }

            .notif-modal-close {
                background: none;
                border: none;
                color: #64748b;
                font-size: 22px;
                cursor: pointer;
                padding: 4px;
                border-radius: 6px;
                line-height: 1;
                transition: color 0.15s ease;
            }
            .notif-modal-close:hover {
                color: #ef4444;
            }

            .notif-modal-body {
                padding: 22px 24px;
                color: #0f172a;
                font-size: 13.5px;
                max-height: 72vh;
                overflow-y: auto;
            }
            [data-theme="dark"] .notif-modal-body {
                color: #e2e8f0;
            }

            .notif-decision-banner {
                border-radius: 12px;
                padding: 14px 18px;
                margin-bottom: 18px;
                display: flex;
                align-items: flex-start;
                gap: 12px;
            }
            .notif-decision-banner.approved {
                background: #ecfdf5;
                border: 1.5px solid #a7f3d0;
                color: #065f46;
            }
            .notif-decision-banner.rejected {
                background: #fef2f2;
                border: 1.5px solid #fecaca;
                color: #991b1b;
            }
            .notif-decision-banner.pending {
                background: #fffbeb;
                border: 1.5px solid #fde68a;
                color: #92400e;
            }

            [data-theme="dark"] .notif-decision-banner.approved {
                background: rgba(16, 185, 129, 0.15);
                border-color: rgba(16, 185, 129, 0.4);
                color: #6ee7b7;
            }
            [data-theme="dark"] .notif-decision-banner.rejected {
                background: rgba(239, 68, 68, 0.15);
                border-color: rgba(239, 68, 68, 0.4);
                color: #fca5a5;
            }
            [data-theme="dark"] .notif-decision-banner.pending {
                background: rgba(245, 158, 11, 0.15);
                border-color: rgba(245, 158, 11, 0.4);
                color: #fcd34d;
            }

            .notif-modal-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 14px;
                margin-bottom: 18px;
            }

            .notif-modal-field {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .notif-modal-label {
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: #64748b;
            }

            .notif-modal-val {
                font-size: 13.5px;
                font-weight: 600;
                color: #0f172a;
                word-break: break-word;
            }
            [data-theme="dark"] .notif-modal-val {
                color: #f1f5f9;
            }

            .notif-modal-box {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                padding: 12px 14px;
                margin-bottom: 16px;
            }
            [data-theme="dark"] .notif-modal-box {
                background: #1e293b;
                border-color: #334155;
            }

            .notif-modal-footer {
                padding: 14px 24px;
                background: #f8fafc;
                border-top: 1px solid #e2e8f0;
                display: flex;
                align-items: center;
                justify-content: flex-end;
                gap: 10px;
            }
            [data-theme="dark"] .notif-modal-footer {
                background: #1e293b;
                border-color: #334155;
            }
        `;
        document.head.appendChild(styleEl);
    }

    // =========================================================
    // AUDIO NOTIFICATION CHIME (WEB AUDIO API SYNTH)
    // =========================================================
    function playNotificationSound() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.36);
        } catch (e) {
            // Audio autoplay policy safe
        }
    }

    // =========================================================
    // TOAST POPUP NOTIFICATION ENGINE
    // =========================================================
    function ensureToastContainer() {
        let container = document.getElementById("wbcmsNotificationToastContainer");
        if (!container) {
            container = document.createElement("div");
            container.id = "wbcmsNotificationToastContainer";
            document.body.appendChild(container);
        }
        return container;
    }

    function showNotificationToast(notification) {
        const container = ensureToastContainer();
        const typeRaw = (notification.type || "SYSTEM").toUpperCase();
        const isProjectReq = typeRaw.startsWith("PROJECT_REQUEST") || (notification.title && notification.title.toLowerCase().includes("project request"));

        let toastClass = "toast-system";
        let iconClass = "bi-bell-fill";
        let iconBg = "#f1f5f9";
        let iconColor = "#475569";
        let label = "New Notification";

        const textCheck = ((notification.title || "") + " " + (notification.message || "")).toUpperCase();
        if (textCheck.includes("APPROV") || textCheck.includes("ACCEPT")) {
            toastClass = "toast-approved";
            iconClass = "bi-check-circle-fill";
            iconBg = "#ecfdf5";
            iconColor = "#059669";
            label = "Project Request Approved";
        } else if (textCheck.includes("REJECT")) {
            toastClass = "toast-rejected";
            iconClass = "bi-x-circle-fill";
            iconBg = "#fef2f2";
            iconColor = "#dc2626";
            label = "Project Request Decision";
        } else if (isProjectReq) {
            toastClass = "toast-request";
            iconClass = "bi-file-earmark-person-fill";
            iconBg = "#eff6ff";
            iconColor = "#2563eb";
            label = "Client Project Request";
        }

        let reqId = extractRequestId(notification);

        const toast = document.createElement("div");
        toast.className = `wbcms-toast-card ${toastClass}`;
        toast.innerHTML = `
            <div class="wbcms-toast-icon" style="background:${iconBg}; color:${iconColor};">
                <i class="bi ${iconClass}"></i>
            </div>
            <div class="wbcms-toast-body">
                <div class="wbcms-toast-top">
                    <span class="wbcms-toast-label">${escapeHtml(label)}</span>
                    <button class="wbcms-toast-close" title="Dismiss">&times;</button>
                </div>
                <div class="wbcms-toast-title">${escapeHtml(notification.title)}</div>
                <div class="wbcms-toast-msg">${escapeHtml(notification.message)}</div>
                <div style="display:flex; align-items:center; justify-content:space-between; margin-top:4px;">
                    <span style="font-size:10.5px; color:#94a3b8;"><i class="bi bi-clock"></i> Just now</span>
                    ${isProjectReq ? `<button class="wbcms-toast-action-btn"><i class="bi bi-eye"></i> View Details</button>` : ''}
                </div>
            </div>
        `;

        // Close button
        toast.querySelector(".wbcms-toast-close").addEventListener("click", function (e) {
            e.stopPropagation();
            dismissToast(toast);
        });

        // View action button
        const actionBtn = toast.querySelector(".wbcms-toast-action-btn");
        if (actionBtn) {
            actionBtn.addEventListener("click", function (e) {
                e.stopPropagation();
                dismissToast(toast);
                markNotificationAsRead(notification.id);
                openClientProjectRequestModal(reqId, notification);
            });
        }

        // Clicking toast card
        toast.addEventListener("click", function () {
            dismissToast(toast);
            if (isProjectReq) {
                markNotificationAsRead(notification.id);
                openClientProjectRequestModal(reqId, notification);
            } else {
                markNotificationAsRead(notification.id);
                toggleNotificationPanel(true);
            }
        });

        container.appendChild(toast);

        // Slide in
        requestAnimationFrame(() => {
            toast.classList.add("show");
        });

        // Auto dismiss after 7.5 seconds
        setTimeout(() => {
            dismissToast(toast);
        }, 7500);
    }

    function dismissToast(toast) {
        if (!toast || !toast.parentElement) return;
        toast.classList.remove("show");
        toast.classList.add("hide");
        setTimeout(() => {
            if (toast.parentElement) toast.remove();
        }, 350);
    }

    // =========================================================
    // EXTRACT REQUEST ID FROM TYPE OR MESSAGE
    // =========================================================
    function extractRequestId(notification) {
        const typeRaw = (notification.type || "").toUpperCase();
        if (typeRaw.startsWith("PROJECT_REQUEST_STATUS:")) {
            const parts = typeRaw.split(":");
            if (parts.length >= 3 && !isNaN(parts[2])) return parts[2];
        }
        if (typeRaw.startsWith("PROJECT_REQUEST:")) {
            const parts = typeRaw.split(":");
            if (parts.length >= 2 && !isNaN(parts[1])) return parts[1];
        }
        // Fallback search in message: #12 or #PRJ-12
        const match = (notification.message || "").match(/#PRJ-(\d+)|Request #(\d+)|request #(\d+)/);
        if (match) return match[1] || match[2] || match[3];
        return null;
    }

    // =========================================================
    // DOM SETUP: BELL & DROPDOWN PANEL
    // =========================================================
    function setupNotificationDOM() {
        const bellBtn = document.getElementById("notifBellBtn") ||
                        document.getElementById("clientNotifBell") ||
                        document.querySelector(".notification-button") ||
                        document.querySelector(".cw-notif-btn");
        if (!bellBtn) return;

        bellBtn.classList.add("notification-button");

        // Ensure badge container exists
        let badgeEl = bellBtn.querySelector(".notification-badge");
        if (!badgeEl) {
            badgeEl = document.createElement("span");
            badgeEl.className = "notification-badge";
            badgeEl.id = "globalNotifBadge";
            bellBtn.appendChild(badgeEl);
        }

        // Parent container relative positioning
        const headerParent = bellBtn.parentElement;
        if (headerParent) {
            headerParent.style.position = "relative";
        }

        // Build Dropdown Panel
        let dropdown = document.getElementById("notificationDropdownPanel");
        if (!dropdown) {
            dropdown = document.createElement("div");
            dropdown.className = "notification-dropdown";
            dropdown.id = "notificationDropdownPanel";
            dropdown.innerHTML = `
                <div class="notif-header">
                    <h4>
                        <i class="bi bi-bell-fill" style="color:#ef4444;"></i>
                        Notifications
                        <span class="notif-unread-count-pill" id="notifHeaderCount">0 Unseen</span>
                    </h4>
                    <button class="notif-mark-all-btn" id="notifMarkAllBtn" title="Mark all notifications as seen">
                        <i class="bi bi-check2-all"></i> Mark all Seen
                    </button>
                </div>
                <div class="notif-tabs">
                    <button class="notif-tab active" data-filter="unseen" id="tabUnseenBtn">
                        <i class="bi bi-circle-fill" style="color:#ef4444; font-size:7px;"></i> Unseen 
                        <span class="notif-tab-count" id="notifUnreadTabCount">0</span>
                    </button>
                    <button class="notif-tab" data-filter="seen" id="tabSeenBtn">
                        <i class="bi bi-check2-all" style="color:#10b981;"></i> Seen 
                        <span class="notif-tab-count" id="notifSeenTabCount">0</span>
                    </button>
                    <button class="notif-tab" data-filter="all" id="tabAllBtn">
                        All 
                        <span class="notif-tab-count" id="notifTotalCount">0</span>
                    </button>
                </div>
                <div class="notif-list" id="notifListContainer">
                    <div class="notif-empty">
                        <i class="bi bi-bell-slash"></i>
                        <span>Loading notifications...</span>
                    </div>
                </div>
                <div class="notif-footer">
                    <span><i class="bi bi-shield-check" style="color:#10b981;"></i> Real-Time Database Sync</span>
                    <button class="notif-clear-btn" id="notifClearReadBtn">Clear Seen</button>
                </div>
            `;
            if (headerParent) {
                headerParent.appendChild(dropdown);
            } else {
                document.body.appendChild(dropdown);
            }
        }

        // Bell Click Toggle
        bellBtn.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            toggleNotificationPanel();
        };

        // Filter Tabs Click
        dropdown.querySelectorAll(".notif-tab").forEach(tab => {
            tab.addEventListener("click", function (e) {
                e.stopPropagation();
                dropdown.querySelectorAll(".notif-tab").forEach(t => t.classList.remove("active"));
                this.classList.add("active");
                currentFilter = this.getAttribute("data-filter");
                renderNotificationList();
            });
        });

        // Mark All Read Button
        const markAllBtn = document.getElementById("notifMarkAllBtn");
        if (markAllBtn) {
            markAllBtn.addEventListener("click", function (e) {
                e.stopPropagation();
                markAllNotificationsAsRead();
            });
        }

        // Clear Read Button
        const clearBtn = document.getElementById("notifClearReadBtn");
        if (clearBtn) {
            clearBtn.addEventListener("click", function (e) {
                e.stopPropagation();
                clearReadNotifications();
            });
        }

        // Close on Click Outside
        document.addEventListener("click", function (e) {
            if (isPanelOpen && dropdown && !dropdown.contains(e.target) && !bellBtn.contains(e.target)) {
                closeNotificationPanel();
            }
        });
    }

    function toggleNotificationPanel(forceOpen = null) {
        const dropdown = document.getElementById("notificationDropdownPanel");
        if (!dropdown) return;
        isPanelOpen = (forceOpen !== null) ? forceOpen : !isPanelOpen;
        dropdown.classList.toggle("open", isPanelOpen);

        if (isPanelOpen) {
            const unreadCount = notificationsList.filter(n => !n.readFlag).length;
            if (unreadCount > 0 && currentFilter !== "unseen" && currentFilter !== "all") {
                currentFilter = "unseen";
                dropdown.querySelectorAll(".notif-tab").forEach(t => {
                    t.classList.toggle("active", t.getAttribute("data-filter") === "unseen");
                });
            }
            renderNotificationList();
        }
    }

    function closeNotificationPanel() {
        const dropdown = document.getElementById("notificationDropdownPanel");
        if (dropdown) dropdown.classList.remove("open");
        isPanelOpen = false;
    }

    // =========================================================
    // FETCH NOTIFICATIONS & REAL-TIME AUTO UPDATE
    // =========================================================
    async function fetchNotifications() {
        const token = getAuthToken();
        if (!token) return;

        try {
            const res = await fetch("/api/notifications/all", { headers: getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                const fetchedList = Array.isArray(data) ? data : [];

                if (isInitialLoad) {
                    fetchedList.forEach(n => knownNotificationIds.add(n.id));
                    isInitialLoad = false;
                    notificationsList = fetchedList;
                    updateBadgeCounters();
                    if (isPanelOpen) renderNotificationList();
                } else {
                    // Check for newly arrived unread notifications
                    const newUnread = fetchedList.filter(n => !n.readFlag && !knownNotificationIds.has(n.id));
                    fetchedList.forEach(n => knownNotificationIds.add(n.id));

                    notificationsList = fetchedList;
                    updateBadgeCounters();

                    // If newly arrived unread notifications exist, display realistic toast popup & chime!
                    if (newUnread.length > 0) {
                        newUnread.forEach(n => showNotificationToast(n));
                        playNotificationSound();
                    }

                    // Auto-update notification panel in real-time without requiring a page refresh
                    if (isPanelOpen) {
                        renderNotificationList();
                    }
                }
            }
        } catch (err) {
            console.warn("Notification sync error:", err);
        }
    }

    function updateBadgeCounters() {
        const unreadCount = notificationsList.filter(n => !n.readFlag).length;
        const seenCount = notificationsList.filter(n => n.readFlag).length;
        const totalCount = notificationsList.length;

        // Update all notification bell badges across headers
        document.querySelectorAll(".notification-badge").forEach(badge => {
            if (unreadCount > 0) {
                badge.classList.add("active");
                badge.textContent = unreadCount > 99 ? "99+" : unreadCount;
                badge.classList.add("with-count");
            } else {
                badge.textContent = "";
                badge.classList.remove("active", "with-count");
            }
        });

        const headerCount = document.getElementById("notifHeaderCount");
        const totalCountEl = document.getElementById("notifTotalCount");
        const unreadTabCount = document.getElementById("notifUnreadTabCount");
        const seenTabCount = document.getElementById("notifSeenTabCount");

        if (headerCount) headerCount.textContent = `${unreadCount} Unseen`;
        if (totalCountEl) totalCountEl.textContent = totalCount;
        if (unreadTabCount) unreadTabCount.textContent = unreadCount;
        if (seenTabCount) seenTabCount.textContent = seenCount;
    }

    // =========================================================
    // RENDER NOTIFICATIONS (UNSEEN & SEEN SECTIONS)
    // =========================================================
    function renderNotificationList() {
        const container = document.getElementById("notifListContainer");
        if (!container) return;

        let filtered = notificationsList;
        if (currentFilter === "unseen") {
            filtered = notificationsList.filter(n => !n.readFlag);
        } else if (currentFilter === "seen") {
            filtered = notificationsList.filter(n => n.readFlag);
        }

        if (filtered.length === 0) {
            let label = "notifications";
            if (currentFilter === "unseen") label = "unseen notifications";
            else if (currentFilter === "seen") label = "seen notifications";

            container.innerHTML = `
                <div class="notif-empty">
                    <i class="bi bi-check2-circle" style="color:#10b981; font-size:32px;"></i>
                    <p style="margin:8px 0 0 0; font-size:13.5px; font-weight:700; color:#0f172a;">All caught up!</p>
                    <span style="font-size:12px; color:#64748b;">No ${label} found right now.</span>
                </div>
            `;
            return;
        }

        container.innerHTML = "";

        // If viewing 'All' and both unseen & seen exist, render with distinct Section Headers
        if (currentFilter === "all") {
            const unseenItems = notificationsList.filter(n => !n.readFlag);
            const seenItems = notificationsList.filter(n => n.readFlag);

            if (unseenItems.length > 0) {
                const secHeader = document.createElement("div");
                secHeader.className = "notif-section-header";
                secHeader.innerHTML = `<span><i class="bi bi-circle-fill" style="color:#ef4444; font-size:7px;"></i> Unseen Notifications</span> <span>${unseenItems.length}</span>`;
                container.appendChild(secHeader);
                unseenItems.forEach(n => container.appendChild(createNotificationItemElement(n)));
            }

            if (seenItems.length > 0) {
                const secHeader = document.createElement("div");
                secHeader.className = "notif-section-header";
                secHeader.innerHTML = `<span><i class="bi bi-check2-all" style="color:#10b981;"></i> Seen Notifications</span> <span>${seenItems.length}</span>`;
                container.appendChild(secHeader);
                seenItems.forEach(n => container.appendChild(createNotificationItemElement(n)));
            }
            return;
        }

        filtered.forEach(n => {
            container.appendChild(createNotificationItemElement(n));
        });
    }

    function createNotificationItemElement(n) {
        const isUnread = !n.readFlag;
        const typeRaw = (n.type || "SYSTEM").toUpperCase();
        const type = typeRaw.toLowerCase();
        const isProjectReq = typeRaw.startsWith("PROJECT_REQUEST") || (n.title && n.title.toLowerCase().includes("project request"));
        const timeAgo = formatTimeAgo(n.createdAt);

        // Detect project request status if embedded or in text
        let reqId = extractRequestId(n);
        let reqStatus = null;
        if (typeRaw.startsWith("PROJECT_REQUEST_STATUS:")) {
            const parts = typeRaw.split(":");
            if (parts.length >= 2) reqStatus = parts[1].toUpperCase();
        }

        const textToCheck = ((n.title || "") + " " + (n.message || "")).toUpperCase();
        if (!reqStatus && isProjectReq) {
            if (textCheck.includes("APPROV") || textCheck.includes("ACCEPT")) reqStatus = "APPROVED";
            else if (textCheck.includes("REJECT") || textCheck.includes("DECLIN")) reqStatus = "REJECTED";
            else if (textCheck.includes("PENDING")) reqStatus = "PENDING";
        }

        let iconClass = "bi-bell-fill";
        let boxClass = "system";
        let borderAccentClass = "";

        if (isProjectReq) {
            if (reqStatus === "APPROVED") {
                iconClass = "bi-patch-check-fill";
                boxClass = "project-req-approved";
                if (isUnread) borderAccentClass = "border-approved";
            } else if (reqStatus === "REJECTED") {
                iconClass = "bi-x-octagon-fill";
                boxClass = "project-req-rejected";
                if (isUnread) borderAccentClass = "border-rejected";
            } else if (reqStatus === "PENDING") {
                iconClass = "bi-hourglass-split";
                boxClass = "project-req-pending";
                if (isUnread) borderAccentClass = "border-pending";
            } else {
                iconClass = "bi-file-earmark-person-fill";
                boxClass = "project-req";
            }
        } else if (type.includes("task")) {
            iconClass = "bi-clipboard-check";
            boxClass = "task";
        } else if (type.includes("material")) {
            iconClass = "bi-box-seam";
            boxClass = "material";
        }

        let statusPillHtml = "";
        if (reqStatus === "APPROVED") {
            statusPillHtml = `<span class="notif-request-status-pill status-approved"><i class="bi bi-check-circle-fill"></i> APPROVED</span>`;
        } else if (reqStatus === "REJECTED") {
            statusPillHtml = `<span class="notif-request-status-pill status-rejected"><i class="bi bi-x-circle-fill"></i> REJECTED</span>`;
        } else if (reqStatus === "PENDING") {
            statusPillHtml = `<span class="notif-request-status-pill status-pending"><i class="bi bi-hourglass-split"></i> PENDING</span>`;
        }

        const item = document.createElement("div");
        item.className = `notif-item ${isUnread ? "unseen" : "seen"} ${borderAccentClass}`;
        item.innerHTML = `
            <div class="notif-icon-box ${boxClass}">
                <i class="bi ${iconClass}"></i>
            </div>
            <div class="notif-content">
                <div class="notif-item-top">
                    <div class="notif-title-wrap">
                        <span class="notif-title">${escapeHtml(n.title)}</span>
                        ${statusPillHtml}
                    </div>
                    ${isUnread 
                        ? '<span class="notif-unseen-tag"><i class="bi bi-circle-fill" style="font-size:6px;"></i> Unseen</span>' 
                        : '<span class="notif-seen-tag"><i class="bi bi-check2-all" style="color:#10b981;"></i> Seen</span>'}
                </div>
                <p class="notif-desc">${escapeHtml(n.message)}</p>
                <div class="notif-item-bottom">
                    <div class="notif-time">
                        <i class="bi bi-clock"></i> ${escapeHtml(timeAgo)}
                    </div>
                    <div class="notif-actions-inline">
                        ${isProjectReq ? `<button class="notif-view-req-btn" data-req-id="${reqId || ''}"><i class="bi bi-eye-fill"></i> View Details</button>` : ''}
                        <button class="notif-toggle-seen-btn" title="${isUnread ? 'Mark as Seen' : 'Mark as Unseen'}">
                            ${isUnread ? 'Mark Seen' : 'Mark Unseen'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        // View Request button
        if (isProjectReq) {
            const viewBtn = item.querySelector(".notif-view-req-btn");
            if (viewBtn) {
                viewBtn.addEventListener("click", function (e) {
                    e.stopPropagation();
                    if (isUnread) markNotificationAsRead(n.id);
                    openClientProjectRequestModal(reqId, n);
                });
            }
        }

        // Toggle Seen / Unseen button
        const toggleBtn = item.querySelector(".notif-toggle-seen-btn");
        if (toggleBtn) {
            toggleBtn.addEventListener("click", function (e) {
                e.stopPropagation();
                toggleNotificationStatus(n.id);
            });
        }

        // Clicking the item directly
        item.addEventListener("click", function () {
            if (isProjectReq) {
                if (isUnread) markNotificationAsRead(n.id);
                openClientProjectRequestModal(reqId, n);
            } else if (isUnread) {
                markNotificationAsRead(n.id);
            }
        });

        return item;
    }

    // =========================================================
    // STATE ACTIONS (MARK AS READ, UNREAD, CLEAR)
    // =========================================================
    async function markNotificationAsRead(id) {
        const notif = notificationsList.find(n => n.id === id);
        if (notif) notif.readFlag = true;
        updateBadgeCounters();
        renderNotificationList();

        try {
            await fetch(`/api/notifications/${id}/read`, {
                method: "POST",
                headers: getAuthHeaders()
            });
        } catch (err) {
            console.warn("Could not mark notification read:", err);
        }
    }

    async function toggleNotificationStatus(id) {
        const notif = notificationsList.find(n => n.id === id);
        if (!notif) return;
        const newReadState = !notif.readFlag;
        notif.readFlag = newReadState;
        updateBadgeCounters();
        renderNotificationList();

        try {
            await fetch(`/api/notifications/${id}/toggle`, {
                method: "POST",
                headers: getAuthHeaders()
            });
        } catch (err) {
            const endpoint = newReadState ? `/api/notifications/${id}/read` : `/api/notifications/${id}/unread`;
            await fetch(endpoint, { method: "POST", headers: getAuthHeaders() });
        }
    }

    async function markAllNotificationsAsRead() {
        notificationsList.forEach(n => { n.readFlag = true; });
        updateBadgeCounters();
        renderNotificationList();

        try {
            await fetch("/api/notifications/mark-all-read", {
                method: "POST",
                headers: getAuthHeaders()
            });
        } catch (err) {
            console.warn("Could not mark all notifications read:", err);
        }
    }

    async function clearReadNotifications() {
        try {
            await fetch("/api/notifications/clear-all", {
                method: "DELETE",
                headers: getAuthHeaders()
            });
            notificationsList = notificationsList.filter(n => !n.readFlag);
            updateBadgeCounters();
            renderNotificationList();
        } catch (err) {
            console.warn("Could not clear read notifications:", err);
        }
    }

    // =========================================================
    // CLIENT PROJECT REQUEST DETAILS MODAL
    // =========================================================
    function setupClientRequestModalDOM() {
        if (document.getElementById("notifClientReqModalOverlay")) return;

        const overlay = document.createElement("div");
        overlay.className = "notif-modal-overlay";
        overlay.id = "notifClientReqModalOverlay";
        overlay.innerHTML = `
            <div class="notif-modal-card">
                <div class="notif-modal-header">
                    <h3>
                        <i class="bi bi-file-earmark-person-fill" style="color:#2563eb;"></i>
                        Project Request & Decision Details
                    </h3>
                    <button class="notif-modal-close" onclick="window.closeClientReqModal()">&times;</button>
                </div>
                <div class="notif-modal-body" id="notifClientReqModalBody">
                    <div style="text-align:center; padding:30px; color:#64748b;">
                        <i class="bi bi-hourglass-split" style="font-size:28px;"></i>
                        <p>Loading project request details...</p>
                    </div>
                </div>
                <div class="notif-modal-footer">
                    <button class="btn btn-secondary" onclick="window.closeClientReqModal()" style="padding:7px 15px; border-radius:8px; border:1px solid #cbd5e1; background:transparent; font-size:12px; font-weight:600; cursor:pointer;">
                        Close
                    </button>
                    <a href="/client-project-requests.html" class="btn btn-primary" id="notifModalGoProjectsBtn" style="padding:7px 16px; border-radius:8px; background:#2563eb; color:#ffffff; font-size:12px; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                        <i class="bi bi-arrow-right-circle"></i> Open in Portal
                    </a>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.addEventListener("click", function (e) {
            if (e.target === overlay) {
                window.closeClientReqModal();
            }
        });
    }

    window.closeClientReqModal = function () {
        const overlay = document.getElementById("notifClientReqModalOverlay");
        if (overlay) overlay.classList.remove("open");
    };

    async function openClientProjectRequestModal(reqId, notification) {
        setupClientRequestModalDOM();
        const overlay = document.getElementById("notifClientReqModalOverlay");
        const body = document.getElementById("notifClientReqModalBody");
        if (!overlay || !body) return;

        overlay.classList.add("open");
        closeNotificationPanel();

        // Modal Action Button link: client dashboard vs staff
        const goBtn = document.getElementById("notifModalGoProjectsBtn");
        if (goBtn) {
            if (isClientUser()) {
                goBtn.href = "/client-project-requests.html";
                goBtn.innerHTML = '<i class="bi bi-folder2-open"></i> Open My Requests';
            } else {
                goBtn.href = "/projects.html";
                goBtn.innerHTML = '<i class="bi bi-kanban"></i> Open in Projects Console';
            }
        }

        // Fetch details if reqId exists
        if (reqId) {
            body.innerHTML = `
                <div style="text-align:center; padding:30px; color:#64748b;">
                    <i class="bi bi-arrow-repeat" style="font-size:28px; animation:spin 1s infinite linear;"></i>
                    <p style="margin-top:8px;">Fetching Request #${reqId} details...</p>
                </div>
            `;
            try {
                // Try staff endpoint first, fallback to client endpoint
                let res = await fetch(`/api/client-project-requests/${reqId}`, { headers: getAuthHeaders() });
                if (!res.ok) {
                    res = await fetch(`/api/client/project-requests/${reqId}`, { headers: getAuthHeaders() });
                }
                if (res.ok) {
                    const req = await res.json();
                    renderClientProjectRequestDetails(body, req, notification);
                    return;
                }
            } catch (err) {
                console.warn("Could not fetch project request:", err);
            }
        }

        renderClientProjectRequestFallback(body, notification);
    }

    function renderClientProjectRequestDetails(body, req, notification) {
        const status = (req.status || "PENDING").toUpperCase();

        // Prominent Decision Banner if approved or rejected
        let decisionBannerHtml = "";
        if (status === "APPROVED") {
            decisionBannerHtml = `
                <div class="notif-decision-banner approved">
                    <i class="bi bi-patch-check-fill" style="font-size:22px; color:#059669; margin-top:2px;"></i>
                    <div>
                        <strong style="font-size:14px; display:block; margin-bottom:3px;">Decision: ACCEPTED / APPROVED</strong>
                        <span style="font-size:12.5px; line-height:1.45;">${escapeHtml(notification.message)}</span>
                    </div>
                </div>
            `;
        } else if (status === "REJECTED") {
            decisionBannerHtml = `
                <div class="notif-decision-banner rejected">
                    <i class="bi bi-x-octagon-fill" style="font-size:22px; color:#dc2626; margin-top:2px;"></i>
                    <div>
                        <strong style="font-size:14px; display:block; margin-bottom:3px;">Decision: REJECTED</strong>
                        <span style="font-size:12.5px; line-height:1.45;">${escapeHtml(notification.message)}</span>
                    </div>
                </div>
            `;
        } else {
            decisionBannerHtml = `
                <div class="notif-decision-banner pending">
                    <i class="bi bi-hourglass-split" style="font-size:22px; color:#d97706; margin-top:2px;"></i>
                    <div>
                        <strong style="font-size:14px; display:block; margin-bottom:3px;">Status: PENDING REVIEW</strong>
                        <span style="font-size:12.5px; line-height:1.45;">${escapeHtml(notification.message)}</span>
                    </div>
                </div>
            `;
        }

        const statusBadge = getStatusBadge(status);

        body.innerHTML = `
            ${decisionBannerHtml}
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <span style="font-size:12px; font-weight:700; color:#64748b; letter-spacing:0.04em;">PROJECT REQUEST #${req.id}</span>
                ${statusBadge}
            </div>
            <div class="notif-modal-grid">
                <div class="notif-modal-field">
                    <span class="notif-modal-label">Project Name</span>
                    <span class="notif-modal-val" style="font-size:15px; color:#2563eb; font-weight:700;">${escapeHtml(req.projectName || "N/A")}</span>
                </div>
                <div class="notif-modal-field">
                    <span class="notif-modal-label">Project Type</span>
                    <span class="notif-modal-val">${escapeHtml(req.projectType || "Commercial")}</span>
                </div>
                <div class="notif-modal-field">
                    <span class="notif-modal-label">Location / Site</span>
                    <span class="notif-modal-val"><i class="bi bi-geo-alt" style="color:#ef4444;"></i> ${escapeHtml(req.location || "N/A")}</span>
                </div>
                <div class="notif-modal-field">
                    <span class="notif-modal-label">Estimated Budget</span>
                    <span class="notif-modal-val" style="color:#10b981; font-weight:700;">$${req.estimatedBudget ? Number(req.estimatedBudget).toLocaleString() : 'Negotiable'}</span>
                </div>
                <div class="notif-modal-field">
                    <span class="notif-modal-label">Client Name</span>
                    <span class="notif-modal-val"><i class="bi bi-person-circle"></i> ${escapeHtml(req.clientName || "Valued Client")}</span>
                </div>
                <div class="notif-modal-field">
                    <span class="notif-modal-label">Client Contact</span>
                    <span class="notif-modal-val">${escapeHtml(req.clientEmail || "")} ${req.clientPhone ? '• ' + escapeHtml(req.clientPhone) : ''}</span>
                </div>
                <div class="notif-modal-field">
                    <span class="notif-modal-label">Preferred Start Date</span>
                    <span class="notif-modal-val"><i class="bi bi-calendar-event"></i> ${escapeHtml(req.preferredStartDate || "Flexible")}</span>
                </div>
                <div class="notif-modal-field">
                    <span class="notif-modal-label">Submitted On</span>
                    <span class="notif-modal-val">${req.createdAt ? new Date(req.createdAt).toLocaleString() : 'Recent'}</span>
                </div>
            </div>

            <span class="notif-modal-label">Scope & Requirements Description</span>
            <div class="notif-modal-box" style="margin-top:5px;">
                <p style="margin:0; font-size:13px; line-height:1.55;">${escapeHtml(req.description || "No additional description provided.")}</p>
            </div>
        `;
    }

    function renderClientProjectRequestFallback(body, notification) {
        body.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <span style="font-size:12px; font-weight:700; color:#64748b;">NOTIFICATION DETAILS</span>
                <span style="background:#eff6ff; color:#1d4ed8; padding:3px 9px; border-radius:6px; font-size:11px; font-weight:700;">RECEIVED</span>
            </div>
            <div class="notif-modal-field" style="margin-bottom:14px;">
                <span class="notif-modal-label">Subject</span>
                <span class="notif-modal-val" style="font-size:15px; color:#2563eb; font-weight:700;">${escapeHtml(notification.title)}</span>
            </div>
            <span class="notif-modal-label">Message</span>
            <div class="notif-modal-box" style="margin-top:6px;">
                <p style="margin:0; font-size:13.5px; line-height:1.55;">${escapeHtml(notification.message)}</p>
            </div>
            <div style="font-size:11.5px; color:#64748b; margin-top:10px;">
                <i class="bi bi-clock"></i> Received: ${notification.createdAt ? new Date(notification.createdAt).toLocaleString() : 'Recent'}
            </div>
        `;
    }

    function getStatusBadge(status) {
        const s = (status || "").toUpperCase();
        if (s === "APPROVED" || s === "ACCEPTED") {
            return `<span style="background:#ecfdf5; color:#059669; border:1px solid #a7f3d0; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:800;">APPROVED</span>`;
        }
        if (s === "REJECTED") {
            return `<span style="background:#fef2f2; color:#dc2626; border:1px solid #fecaca; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:800;">REJECTED</span>`;
        }
        return `<span style="background:#fffbeb; color:#d97706; border:1px solid #fde68a; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:800;">PENDING REVIEW</span>`;
    }

    function formatTimeAgo(isoString) {
        if (!isoString) return "Recently";
        const date = new Date(isoString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return "Just now";
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    }

    function escapeHtml(text) {
        if (!text) return "";
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // =========================================================
    // INITIALIZATION & POLLING
    // =========================================================
    function init() {
        injectStyles();
        setupNotificationDOM();
        setupClientRequestModalDOM();
        ensureToastContainer();

        if (getAuthToken()) {
            fetchNotifications();
            if (pollIntervalId) clearInterval(pollIntervalId);
            // Real-time synchronization polling every 4 seconds
            pollIntervalId = setInterval(fetchNotifications, 4000);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    // Expose Global API
    window.WBCMS_Notifications = {
        fetch: fetchNotifications,
        markRead: markNotificationAsRead,
        markAllRead: markAllNotificationsAsRead,
        viewClientRequest: openClientProjectRequestModal,
        showToast: showNotificationToast
    };
})();
