-- Seeder 003: Sample FAQs
SET NAMES utf8mb4;

INSERT INTO faqs (uuid, category, question, answer, sort_order, is_active) VALUES
(UUID(), 'account', 'How do I verify my email?', 'After registration, open the verification email and click the link, or paste the token on the verify-email page.', 1, 1),
(UUID(), 'listing', 'How long does property approval take?', 'Listings are reviewed by admins. Typical turnaround is within 24–48 hours on business days.', 2, 1),
(UUID(), 'visits', 'How do I book a site visit?', 'Open an approved property page, choose a future date/time under Book site visit, and submit. The host will confirm.', 3, 1),
(UUID(), 'payment', 'Are subscriptions required to list?', 'Agents and owners may need an active plan depending on platform settings. Contact support for plan details.', 4, 1),
(UUID(), 'support', 'How do I raise a support ticket?', 'Sign in, open Support → Tickets (or Contact Support), describe your issue, and our team will respond in-thread.', 5, 1)
ON DUPLICATE KEY UPDATE question = VALUES(question);
