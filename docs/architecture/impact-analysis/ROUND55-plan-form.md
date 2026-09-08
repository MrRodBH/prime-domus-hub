# Round55 — plan form corrections
Base main 7c375a088db1621b22ca2b0e3f01b0cb31e5965f.

Owner requests removal of unnecessary manual code and portal inputs plus Brazilian currency mask. Existing plan code is a persisted business reference (tenant.plano_codigo); retain contract and codes but generate new codes deterministically from the already allocated plan UUID. No manually entered code or technical code in plan rows. Remove subscription sales portal/product inputs from this form; preserve existing metadata values on edits. Those fields are subscription sales linkage, not real-estate distribution settings; do not move them to property records.

BRL input uses digit-based cents masking (49900 → 499,00; 123456 → 1.234,56), decimal input mode and strict parse to integer cents. Existing schema retains its server-side limits and authorization. Clear/invalid values fail safely; failed saves preserve the form and the allocated ID/code. New formatting helpers are pure presentation functions.

No server API, schema, migration, permissions, tenant data or credentials change. Twelve-Factor, approved theme and isolation maintained. Round52 controlled DOM is evolved for the new form while preserving save failures, reload, editing, search and tenant-access callback. Tests cover grouped currency, zeros, limits, invalid strings, stable code and preserved hidden integration metadata. CI tests use fictitious isolated data; they do not establish remote acceptance. #229/#231/#227/#230 and Round45 backlog retained; LSR02 Rejected — Terminal, 0/2.
