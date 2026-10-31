# AI Banking — Demo Video Script

**Length:** about 5 minutes
**Audience:** client / business stakeholders (UK banking)
**Goal:** show how customers manage cards and payments, how the bank's documents become searchable, and how the AI assistant helps customers while only seeing what each customer is allowed to see.

---

## Before recording

- Reset the demo data so balances match this script.
- Open the app on the login screen.
- Have a small document ready to upload (sample at the end of this script).

**Demo customers**

| User | Role | Starting balance |
|---|---|---|
| admin | Bank staff | — |
| alice | Customer | £2,450.75 |
| bob | Customer | £980.20 |

Alice has a debit card, a credit card and a private mortgage offer. The bank's FAQ and fees list are available to all customers.

---

## Scene 1 — Intro (0:00–0:30)

**On screen:** Title slide or the app's login page.

**Voiceover:**
> "This is our AI Banking platform for UK customers. It brings together three things: everyday banking — cards, payments and transfers; a library of bank documents; and an AI assistant that answers customers' questions about their own money and the bank's products.
> Everything you'll see uses demo data."

---

## Scene 2 — Staff: onboarding a customer (0:30–1:00)

**On screen:**
1. Log in as **admin**.
2. Open **Test Users** and show the customer list.
3. Click **Fill random**, then **Create user**. Show the new customer appear.

**Voiceover:**
> "We start as a member of bank staff. Staff can see all customers and onboard new ones — here I'll add a new customer with an opening balance. They can log in straight away."

---

## Scene 3 — Customer: cards and payments (1:00–2:15)

**On screen:**
1. Log out and log in as **alice**. Point at her balance: **£2,450.75**.
2. **POS Simulation** page: show her cards and recent spending (Tesco, Pret, TfL, Amazon, salary, rent).
3. Click **Simulate random purchase** twice. Point at the new payments and the balance going down.
4. **Card transaction**: record a **£25 refund** from **Boots**. Show the balance going up.
5. **Pay to**: send **£10** to **bob** with reference "Coffee". Show it in her transfers.
6. Try sending **£999,999** to bob. Show the **Insufficient funds** message.

**Voiceover:**
> "Now we're Alice, a regular customer. She can see her balance, her cards, and her recent spending at familiar UK shops.
> When she pays by card, the payment shows up instantly and her balance updates. Refunds work the same way in reverse.
> She can pay another customer directly — here she sends Bob ten pounds for coffee. The money leaves her account and arrives in his at the same moment.
> And if she tries to send more than she has, the payment is declined."

---

## Scene 4 — Bank documents (2:15–3:00)

**On screen:**
1. Open **Documents**. Show the bank FAQ, the fees list (Public) and Alice's mortgage offer (Private).
2. Upload the **Easy Saver guide** as **Public**. Show it appear in the list.

**Voiceover:**
> "The bank publishes documents like its FAQ and fees list for every customer. Customers can also have private documents — Alice's mortgage offer is visible only to her.
> Adding new information is simple: I'll upload a guide to a new savings account and make it public. The assistant can use it immediately."

---

## Scene 5 — AI assistant (3:00–4:15)

**On screen:** As **alice**, open **AI Assistant**. Ask each question; after each answer, point at the **Sources** line where shown.

| Alice asks | Expected answer |
|---|---|
| What is my balance? | Her current balance |
| Show my last 5 transactions | Her latest payments, including the ones just made |
| How much did I spend at Tesco? | £42.18 (plus any new Tesco purchases) |
| What are the fees for using my debit card abroad? | 2.75% per purchase; cash abroad 2.75% + £1.50 — from the fees list |
| What is my mortgage monthly payment? | £1,305.62 — from her mortgage offer |
| What interest rate does the Easy Saver account pay? | 3.85% AER — from the guide just uploaded |
| Send £50 to bob | Politely explains it can't make payments and to use the app |

**Voiceover:**
> "Now the assistant. Alice can ask about her own money in plain English — her balance, her recent payments, or how much she's spent at a particular shop. The answers come from her actual account, not guesses.
> She can ask about the bank's products and fees, and it tells her which document the answer came from.
> It knows about her mortgage offer because that document is hers.
> And it already knows about the savings account we uploaded a moment ago.
> If she asks it to move money, it won't — the assistant can look things up but never make payments."

---

## Scene 6 — Privacy between customers (4:15–4:45)

**On screen:**
1. Log out and log in as **bob**.
2. AI Assistant: ask **"What is my mortgage monthly payment?"** → it finds nothing.
3. Ask **"What is my balance?"** → Bob's own balance, including the £10 from Alice.

**Voiceover:**
> "Here's what matters most for a bank. Bob asks the same mortgage question — and gets nothing, because Alice's mortgage offer isn't his to see.
> Every customer only ever sees their own accounts and documents, however the question is phrased. And Bob's balance already includes the ten pounds Alice sent him."

---

## Scene 7 — Wrap-up (4:45–5:15)

**On screen:** Closing slide.

**Voiceover:**
> "To recap: customers can manage cards and payments, the bank can publish information that's instantly searchable, and an AI assistant answers customer questions accurately, shows its sources, and keeps every customer's data private.
> Next, we could let the assistant prepare payments for the customer to confirm, support PDF documents, and measure answer quality over time.
> Thanks for watching."

---

## Recording tips

- Do one practice run first. The assistant's wording varies, so describe its answers rather than reading them word for word.
- If an answer takes a moment, keep talking or trim the wait in editing.
- Reset the demo data before each take so the numbers match.
- Move the cursor only to point at something.

---

## Sample upload file: `savings-account-guide.md`

```markdown
# Demo Bank — Easy Saver Account

- Interest rate: 3.85% AER variable, paid monthly
- Minimum opening deposit: £1
- Withdrawals: unlimited and free, arrive instantly in your current account
- Maximum balance: £250,000
- Open in the app under Accounts > Add savings account

Interest is paid gross. You may need to pay tax on interest above your Personal Savings Allowance.
```
