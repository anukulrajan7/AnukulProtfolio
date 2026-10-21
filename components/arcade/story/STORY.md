# The Long Way to OK: story script

Five developers, before AI and after. Simple English, short lines. This file is the source of truth for
`story/chapters/*.ts`: dialogue in code should match it.

**One loop per chapter, so nobody gets lost:**
1. **Before AI.** Do the task the hard way and feel the pain.
2. **With AI.** The same kind of task, done in seconds.
3. **One choice** that shows who this person is. **One keepsake** for what they learned.

Every beat sets a **Goal** line in the HUD. Someone always leaves (an empty chair, a text, a closed laptop).
The cast is connected: Sen is Zoya's senior and was Anukul's internship senior, and Zoya joins Anukul's team.

| # | Player | Years | Keepsake |
|---|---|---|---|
| Prologue | Anukul | 2026 | none |
| 1 The late start | Meera, 31, bank job → developer | 2018 → 2026 | listen |
| 2 All the answers | Sen, senior, 10+ years | 2016 → 2026 | check |
| 3 The one who left | Ravi, burnt out, quit | 2020 → 2026 | why |
| 4 The day Tab went down | Zoya, 22, first job | 2026 → 2026 without Tab | read |
| 5 The long way | Anukul | 2019 → 2023 → 2026 | plain, look, (sorry), unknown |
| Finale | Anukul | 2026 | none |

---

## Prologue · The question (Anukul, 2026, 1:12 am, home)
Keep the current walk-around (chai, switch, window, bed, laptop). Goal: **"Check on your laptop."**
Tab pops out: "Done. Tests pass. I wrote those too." / "That took me a week last time." / "Eight seconds. I counted."
Tab: "I can build almost anything you ask. So, honest question." / "What do you do?" Then an empty answer slot.
You: "…" / "I'll get back to you." / Tab: "Take your time. I'm fast, not in a hurry."

**Card:** "The Long Way to OK". Sub: "Five developers. Before AI, and after."

- Tab: "Everyone who builds things is asking that question now."
- You: "Then let me tell you about five of them. Four people I know. And me."
- Tab: "I have time. I have so much time."

## Chapter 1 · The late start (Meera)
**Card:** "Chapter 1 of 5 · Meera" / "The late start"

### 2018 · before AI (home, night, warm sepia, no Tab)
**Era card:** "2018 · before AI". Sub: "Meera is 31. She works at a bank. At night, she learns to code."
Goal: **"Finish the video lesson before your son wakes up."** Her son is asleep on the bed (glint: "Her son").

- Narrator: "11:40 pm. The bank job ends at 6. The real work starts now."
- Meera sits at the laptop. Press **Play lesson**. Narrator: "The teacher talks fast. 'Just use a closure,' he says."
- Meera: "What is a closure?" Press **Rewind**, and Meera says "Again." Press **Rewind** again, and Meera says "Again. Slower, please."
- Narrator: "Her son coughs in his sleep." / Meera: "Shh. Five more minutes."
- **Choice:** "Pause and look it up" / "Keep watching and hope"
  - Pause: Meera writes on a sticky note: "Closure = a function that remembers." (understanding +1)
  - Keep watching: Narrator: "It doesn't make sense. She rewinds anyway."
- Transition, card: "Eight months later". Goal: **"Read your emails."**
- Press **Open email** 3 times:
  - "We regret to inform you…"
  - "We have decided to move ahead with other candidates."
  - "You don't have a computer science degree, so…"
- Narrator: "Forty applications. Forty no's."
- Narrator: "Her friend from the course sends a message: 'I'm stopping. Too old for this. All the best.'"
- **Choice:** "Send application 41" / "Close the laptop"
  - Close: Narrator: "She closes it. Ten minutes later, she opens it again." (Then it continues as Send.)
- Narrator: "Application 41 said yes." / Meera: "Junior developer. At 32. Ha." (happy)

### 2026 · with AI (office, Tab visible)
**Era card:** "2026 · with AI". Sub: "Meera is a developer now. The office is quieter than before."
Goal: **"Finish today's tickets."**

- Tab: "I finished your six tickets. And the team's. Want me to take next week too?"
- Boss: "Meera, we're not hiring juniors this year. Tab does the junior work now."
- Meera: "I was a junior three years ago." / Boss: "I know. That's why I'm telling you first."
- Narrator: "Two people on her team left that month." (two empty chairs)
- Goal: **"Find out why customers are angry."** Tab suggests: **"Tab's fix: make the Pay button bigger"**
  - Inspect note: "Tab only read the complaint report. Nobody talked to a customer."
  - Accept (bad): Tab: "Done! Bigger button." / Boss: "Complaints went up." / Meera: "Okay. I'll call one."
  - Reject (good): Meera: "Before we fix it, I want to call one."
- Press **Call a customer**. Customer: "It's not the button, beta. I'm 60. I can't read that small grey text."
- Meera: "Nobody asked them. Not the old way. Not the new way."
- Meera: "Tab, make the text big and dark." / Tab: "Oh. Nobody wrote that down anywhere."
- Meera: "That's my job. I go and ask." (proud)
- **Keepsake `listen`:** "A sticky note: call the customer" · "I ask the real people."

## Chapter 2 · All the answers (Sen)
**Card:** "Chapter 2 of 5 · Sen" / "All the answers"

### 2016 · before AI (office, sepia)
**Era card:** "2016 · before AI". Sub: "Sen has been coding for ten years. Everyone comes to his desk."
Goal: **"Help the juniors."**

- Arjun walks up: "Sen bhaiya, the build is broken." / Sen: "Line 40. You forgot to wait for the data."
- Press **Help** 3 times, each answering a bark:
  - "Sen bhaiya, what's a race condition?" Sen: "Two people editing one file at once. Someone loses."
  - "Sen bhaiya, the server is down!" Sen: "Restart the queue. Then tell me who changed the config."
  - "Sen bhaiya, chai?" Sen: "Always."
- Narrator: "He knows every bug in this building by heart. It feels good to be needed."

### 2026 · with AI (office, Tab visible)
**Era card:** "2026 · with AI". Sub: "Ten years later. Nobody comes to his desk."
Goal: **"Wait for someone to ask you something."**

- Arjun walks past Sen to Tab: "Tab, why is the build broken?" / Tab: "Line 40. You forgot to wait for the data." / Arjun: "Thanks, Tab!"
- Sen: "That was my line." (posture drops, tired)
- Narrator: "His old friend Kiran left tech last month. 'The machine knows more than us now,' Kiran said."
- Two glints at his desk: **"Draft email: Resignation"** and **"Tab's big change (needs review)"**.
  - Resignation: Sen types. Narrator: "He doesn't send it. Not yet."
  - Review → Goal: **"Review Tab's change."** Tab suggests: **"Ship Tab's database clean-up (2,000 lines)"**
    - Inspect note: "Line 1,412 deletes 'old' users. 'Old' means anyone who joined before 2020. That's half the customers."
    - Accept (bad): an alarm. Arjun: "Half the users just vanished!" / Sen: "Undo. Now. …I should have read it." Then they restore it.
    - Reject (good): Sen: "Line 1,412. You'd delete half our customers." / Tab: "…How did you see that so fast?" / Sen: "Ten years of breaking things."
- Arjun comes back: "Sen bhaiya… can you check mine too?" Sen smiles (posture up).
- Sen: "The machine writes. Someone still has to know what to check."
- **Keepsake `check`:** "A red pen" · "I know what to check."

## Chapter 3 · The one who left (Ravi)
**Card:** "Chapter 3 of 5 · Ravi" / "The one who left"

### 2020 · before AI (home, 2 am, sepia)
**Era card:** "2020 · before AI". Sub: "Ravi is a developer. It's his third 2 am this week."
Goal: **"Fix the server. Again."**

- Press **Fix it**, with the clock at 2:04. Narrator: "2:04 am. Server down."
- Press **Fix it**, with the clock at 2:51. Narrator: "2:51 am. Down again."
- Press **Fix it**, with the clock at 3:30. Narrator: "3:30 am. Down again." Ravi slumps.
- Narrator: "His dad calls. 'Beta, the shop needs help. And you sound tired.'"
- **Choice:** "Quit. Help Dad's shop." / "Stay one more year."
  - Stay: Narrator: "He stays one more year. It doesn't get better." (Then it continues as Quit.)
- Press **Close the laptop**. Narrator: "Ravi left tech in 2020. He didn't write code for five years."

### 2026 · with AI (street, at the chai stall = Dad's shop)
**Era card:** "2026 · with AI". Sub: "Ravi runs his dad's chai shop now. Something made him curious again."
Goal: **"Make a billing app for the shop."**

- Ravi: "Tab, make a billing app. Chai, samosa, total. Simple."
- Tab: "Done. Eight seconds." / Ravi: "In 2020, that was my whole month." (laughs)
- Customer: "Bhaiya, you charged me two times!"
- Goal: **"Fix the double bill."** Tab suggests: **"Copy Tab's fix: add a 2-second wait"**
  - Inspect note: "A wait only hides it. The real bug: every tap on Pay sends a new bill."
  - Accept (bad): The next customer taps three times and is charged three times. Ravi: "Okay. Tab, explain it. Plain words."
  - Reject (good): Ravi: "Explain it first. Plain words."
- Tab: "If someone taps Pay twice, I send two bills."
- Ravi: "So, one bill per order. Even if they tap ten times." / Tab: "…That's better than mine."
- Ravi: "I left because it was too much. Now it's fast. But I still need to know why."
- Dad: "Beta, you look happy. First time in years." (happy)
- Narrator: "Ravi took small coding jobs again. Daytime only."
- **Keepsake `why`:** "A chai shop bill" · "I ask why before I copy."

## Chapter 4 · The day Tab went down (Zoya)
**Card:** "Chapter 4 of 5 · Zoya" / "The day Tab went down"

### 2026 · with AI (office)
**Era card:** "2026 · with AI". Sub: "Zoya is 22. First job. She has never coded without AI."
Goal: **"Finish your first ticket."**

- Tab: "Your first ticket? Done. Your second one too."
- Zoya: "Easy. Why did everyone say this job is hard?" (happy)
- Narrator: "Half her class stopped learning to code. 'AI does it,' they said."
- Sen: "Welcome, Zoya. Ask me anything." / Zoya: "It's okay. Tab answers everything." / Sen (tired): "Yeah. It does."

### 2026 · without AI (same office, Tab gone)
- Alarm, and the monitor turns red. Narrator: "3:10 pm. The checkout page is down. Customers can't pay."
- Tab: "I'm… having… some… trouble…" Tab fades out. Narrator: "Tab is down. Everywhere."
- **Era card:** "2026 · without AI". Sub: "For one afternoon, there is no Tab."
- Zoya: "Okay. No Tab. Um." Goal: **"Fix the checkout. Without Tab."**
- **Choice:** "Wait for Tab to come back" / "Read the error myself"
  - Wait: Press **Refresh** twice: "Still down." / Sen: "Customers are leaving, Zoya." Then she reads it.
- **Choice: "Which line matters?"**
  - "Error: something went wrong"
  - "TypeError: price is undefined (cart.ts, line 88)" ✅
  - "Warning: 400 old warnings"
  - Wrong pick: Sen: "Read the whole error. Not the first line." Then choose again.
- Zoya: "Price is undefined… the new item has no price!" Press **Add the price**. The monitor turns green.
- Narrator: "3:52 pm. Customers can pay again."
- Sen: "You read the error. The whole error." / Zoya: "Is that what you all did? Before?" / Sen: "Every single day."
- Tab fades back: "I'm back! Did I miss anything?" / Zoya: "Nope. Handled it." (proud)
- Zoya: "Next week I join the live-location team. With Anukul."
- **Keepsake `read`:** "A printed error log" · "I read the whole error."

## Chapter 5 · The long way (Anukul)
**Card:** "Chapter 5 of 5 · Anukul" / "The long way"

### 2019 · before AI (hostel room = home scene, sepia, no Tab)
**Era card:** "2019 · before AI". Sub: "Anukul is in college. Programming words feel like another language."
Goal: **"Print a triangle of stars."** Chintu (a classmate) is in the room.

- Narrator: "The assignment: print a triangle of stars. Using a for loop."
- Press **Run**. The laptop prints one long line. Narrator: "One long line of stars."
- Press **Run**. The laptop prints a square. Narrator: "A square. Not a triangle."
- Chintu: "Bro, it's 2 am. Coding is not for me. I'm doing an MBA." Chintu walks out, and his chair stays empty.
- Narrator: "Day two. Nobody to ask. No AI. Just a notebook."
- **Slot: "Write it in plain words first. Put the steps in order."** (max 3). The pieces:
  - "For each row, from 1 to 5"
  - "print that many stars"
  - "then go to a new line"
  - "print 5 stars every time" (the wrong piece)
  - The right order is the first three in order. Wrong: Narrator: "Not yet. Read your own words again." Then try again.
- The laptop shows a triangle. Anukul: "A triangle. Two days for a triangle." (happy) / "I'll never forget how."
- **Keepsake `plain`:** "A notebook page of stars" · "I think in plain words first."

### 2023 · AI arrives (office, sepia-light, no Tab: just a chat window)
**Era card:** "2023 · AI arrives". Sub: "Anukul's first internship. Everyone has a new AI chat tool."
Goal: **"Finish your first task."**

- Narrator: "The AI wrote the code in ten seconds. Anukul pasted it. It worked."
- Sen: "Nice. Explain line 12 to me."
- **Choice:** "…The AI wrote it." / "Read it line by line, in plain words"
  - AI wrote it: Sen: "Then it's the AI's code, not yours. Read it until it's yours."
  - Read it: (understanding +1) Anukul: "Line 12 waits for the data, then shows it." / Sen: "Good. Now it's yours."
- Sen: "The tool is new. The job is old. Know what your code does."
- Narrator: "2024. 2025. New jobs. Live maps."

### 2026 · with AI (the field test: existing office → street → replay)
**Era card:** "2026 · with AI". Sub: "Anukul builds live maps now. Zoya is on the team. Today: test live location on a real street."
Keep the existing beats, but use plain words:
- Street opener (Tab): "A phone never knows exactly where you are. It guesses. Small circle: it's sure. Big circle: it's guessing."
- Before stamping (narrator): "Now mark each part of the walk. Sure? Draw a line. Not sure? Keep a circle. No signal? Write 'unknown'."

## Finale · OK (Anukul, 2026, 1:32 am, home → dawn)
- Tab: "So. Five people."
- Tab: "Meera asked real people. Sen knew what to check. Ravi asked why. Zoya read the whole error."
- Tab: "And you wrote it in plain words, then went to look."
- Tab: "None of them did what I do. Typing fast."
- The existing honest/lake-line lines come next. Then Tab: "Okay. Then let me ask again." / "What do you do?"
- **Slot:** "Your answer. Place what you've earned." (max 3, from every keepsake earned). You say the sentence.
- Dawn. Tab: "OK." / You: "OK."
- **Card:** "Many people left." Sub: "Some because it was too hard. Some because it got too easy. These five stayed, for different reasons."
- End screen.
