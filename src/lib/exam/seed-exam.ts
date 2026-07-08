import type { Section } from "../types";

export const SEED_TITLE = "Simulador MET 4";
export const SEED_DURATION = 90; // minutos
export const SEED_ID = "seed-met-4"; // id estable para poder re-sembrar sin duplicar
export const SEED_VERSION = 3; // súbelo cuando cambie el contenido del seed

export const SEED_SECTIONS: Section[] = [
  // ---------------------------------------------------------------------------
  // WRITING
  // ---------------------------------------------------------------------------
  {
    kind: "writing",
    title: "Writing",
    writingTasks: [
      {
        id: "w1",
        prompt: "What time do you usually start studying?",
        minWords: 20,
        feedbackGuide: "Answer the question with a complete sentence and add a brief explanation.",
      },
      {
        id: "w2",
        prompt: "Why do you study at that time?",
        minWords: 20,
        feedbackGuide: "Give a clear reason and support it with a short example.",
      },
      {
        id: "w3",
        prompt: "Is it easy or difficult for you to study for a long time? Why?",
        minWords: 20,
        feedbackGuide: "State your opinion clearly and justify it with at least one reason.",
      },
      {
        id: "w4",
        prompt:
          "Nowadays, many libraries are changing their focus and becoming media centers with mostly electronic materials and new technology. However, some remain more traditional, focusing on printed publications and face-to-face programs. Which do you think is the better approach?",
        minWords: 150,
        feedbackGuide:
          "Write a structured essay: introduction with a clear thesis, two body paragraphs with examples, and a conclusion.",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // LISTENING
  // ---------------------------------------------------------------------------
  {
    kind: "listening",
    title: "Listening",
    items: [
      // ----- PARTE 1 -----
      {
        id: "l1",
        stem: "What does the man say about performing in public?",
        transcript:
          "Woman: You're easily the best guitar player in class. You should perform in public.\nMan: Yeah...\nWoman: You're at least as good as anyone I've heard at, like, a coffee shop. Plus, you could make a little extra money on the side.\nMan: That would be nice, but playing in public is not my cup of tea. I have been thinking about making money by giving lessons, though.",
        options: ["He doesn't like to play in public."],
        correctIndex: 0,
      },
      {
        id: "l2",
        stem: "What does the man want to do?",
        transcript:
          "Woman: You’re really good at drawing portraits. You should sell some of your work online.\nMan: Maybe, but I’m not sure.\nWoman: People would definitely pay for drawings like yours. You could earn some extra money.\nMan: That sounds nice, but selling art online isn’t really my thing. I’ve been thinking about teaching kids how to draw, though.",
        options: ["He wants to teach kids how to draw."],
        correctIndex: 0,
      },
      {
        id: "l3",
        stem: "What is the woman worried about?",
        transcript:
          "Man: You’re one of the fastest runners on the team. You should enter the city race next month.\nWoman: I don’t know about that.\nMan: Come on. You’re as fast as some of the people who usually win.\nWoman: Maybe, but running in a big race makes me nervous. I’d rather help train the younger runners.",
        options: ["She is worried about running in a big race."],
        correctIndex: 0,
      },
      {
        id: "l4",
        stem: "Why does the man not want to bake the cake?",
        transcript:
          "Woman: Your chocolate cake is amazing. You should bring it to the school bake sale.\nMan: Thanks, but I’m not sure.\nWoman: I’m serious. It tastes better than the cakes from most bakeries.\nMan: That’s kind of you to say, but baking for a lot of people sounds stressful. I might just donate some cookies instead.",
        options: ["He thinks baking for many people would be stressful."],
        correctIndex: 0,
      },
      {
        id: "l5",
        stem: "How does the woman feel about the competition?",
        transcript:
          "Man: You speak Spanish really well. You should join the language competition.\nWoman: I’ve thought about it.\nMan: You’d probably do great. Your pronunciation is better than mine.\nWoman: Thanks, but competitions aren’t my favorite. I’d rather use Spanish when I travel.",
        options: ["She is not very interested in it."],
        correctIndex: 0,
      },
      {
        id: "l6",
        stem: "What kind of photos does the man prefer to take?",
        transcript:
          "Woman: You take such great photos. You should work as a photographer at events.\nMan: I appreciate that.\nWoman: Really, your pictures look professional. You could make money on weekends.\nMan: That would be useful, but taking pictures at crowded events doesn’t sound fun to me. I prefer taking nature photos.",
        options: ["Nature photos."],
        correctIndex: 0,
      },
      {
        id: "l7",
        stem: "Why does the man suggest starting a repair business?",
        transcript:
          "Man: You’re excellent at fixing computers. You should start a small repair business.\nWoman: I don’t know if I want to do that.\nMan: Why not? People always ask you for help anyway.\nWoman: True, but I don’t want computer repair to become a job. I like helping friends, but that’s enough.",
        options: ["Because people already ask the woman for help with computers."],
        correctIndex: 0,
      },
      {
        id: "l8",
        stem: "What will the man probably do instead of singing at the concert?",
        transcript:
          "Woman: You have a great voice. You should sing at the school concert.\nMan: I’m not sure about that.\nWoman: You’re at least as good as the students who sang last year.\nMan: Maybe, but singing in front of a large audience isn’t for me. I’d rather record songs at home.",
        options: ["He will probably record songs at home."],
        correctIndex: 0,
      },
      {
        id: "l9",
        stem: "What is the woman concerned about?",
        transcript:
          "Man: Your science project was really interesting. You should present it at the fair.\nWoman: I liked making it, but presenting is different.\nMan: You explained it really well to our class.\nWoman: Thanks, but speaking in front of judges makes me uncomfortable. I’d rather write a report about it.",
        options: ["Speaking in front of judges."],
        correctIndex: 0,
      },
      {
        id: "l10",
        stem: "What does the man say about performing in public?",
        transcript:
          "Woman: You're easily the best guitar player in class. You should perform in public.\nMan: Yeah...\nWoman: You're at least as good as anyone I've heard at, like, a coffee shop. Plus, you could make a little extra money on the side.\nMan: That would be nice, but playing in public is not my cup of tea. I have been thinking about making money by giving lessons, though.",
        options: ["He doesn't like to play in public."],
        correctIndex: 0,
      },
      {
        id: "l11",
        stem: "Why does the man choose to take the stairs?",
        transcript:
          "Man: Well, this looks like fun. Are you leading a tour?\nWoman: Yes, our group here is from Ferndale Elementary School, going up to tour a law firm on the fourth floor.\nMan: You probably all need to stay together, right? You know what? I'd be happy to take the stairs.",
        options: ["Because the group of students needed to stay together."],
        correctIndex: 0,
      },
      {
        id: "l12",
        stem: "What does the woman ask the man to bring?",
        transcript:
          "Woman: Could you bring a highlighter and some blank note cards when you come over later?\nMan: Sure, I'll look through my stuff and see if I have any. What did you want to use them for?\nWoman: I just thought they'd help us keep track of everything from our research that we want to add to the presentation.\nMan: Yeah, I'll see what I can find.",
        options: ["Supplies to help them with an assignment."],
        correctIndex: 0,
      },
      {
        id: "l13",
        stem: "When might the man volunteer at the animal shelter?",
        transcript:
          "Woman: You’re great with animals. You should volunteer at the animal shelter.\nMan: I’ve considered it.\nWoman: You’d be perfect for it. Animals seem to like you.\nMan: I’d love to help, but I don’t have enough free time right now. Maybe during summer vacation.",
        options: ["During summer vacation."],
        correctIndex: 0,
      },
      {
        id: "l14",
        stem: "Why is the woman hesitant to post her videos online?",
        transcript:
          "Man: You make really creative videos. You should start posting them online.\nWoman: Maybe someday.\nMan: I think people would enjoy them. They’re funny and well edited.\nWoman: Thanks, but I’m not comfortable sharing my videos with everyone. I mostly make them for my friends.",
        options: ["She does not feel comfortable sharing them with everyone."],
        correctIndex: 0,
      },
      {
        id: "l15",
        stem: "What can be inferred about the man?",
        transcript:
          "Woman: You’re very good at chess. You should join the school tournament.\nMan: I’m not sure I’m ready.\nWoman: You beat almost everyone in our club.\nMan: That’s true, but tournaments feel too serious to me. I prefer playing just for fun.",
        options: ["He enjoys chess, but not in a serious competition."],
        correctIndex: 0,
      },
      {
        id: "l16",
        stem: "What problem does the woman mention?",
        transcript:
          "Man: Your handwriting is beautiful. You should design invitations for people.\nWoman: That’s an interesting idea.\nMan: You could probably make some money doing it.\nWoman: Maybe, but I’m too slow. I enjoy doing it, but only when I’m not in a hurry.",
        options: ["She works too slowly."],
        correctIndex: 0,
      },
      {
        id: "l17",
        stem: "What does the man offer to do?",
        transcript:
          "Woman: You’re really good at explaining math. You should become a tutor.\nMan: I’ve thought about that.\nWoman: You helped me understand the homework better than the textbook did.\nMan: I’m glad, but tutoring every week might be hard with my schedule. I could help before exams, though.",
        options: ["Help before exams."],
        correctIndex: 0,
      },
      {
        id: "l18",
        stem: "What will the woman probably do for the talent show?",
        transcript:
          "Man: You dance really well. You should perform at the talent show.\nWoman: I don’t think so.\nMan: Why not? You’re better than most people in the dance club.\nWoman: Maybe, but performing on stage makes me nervous. I’d rather help plan the show.",
        options: ["Help plan the show."],
        correctIndex: 0,
      },
      {
        id: "l19",
        stem: "Why does the woman think the man should enter the contest?",
        transcript:
          "Woman: You cook really well. You should apply for the cooking contest.\nMan: I like cooking, but I’m not sure about contests.\nWoman: Your pasta is as good as anything from a restaurant.\nMan: Thanks, but cooking under pressure doesn’t sound enjoyable. I’d rather cook dinner for friends.",
        options: ["Because she thinks his cooking is very good."],
        correctIndex: 0,
      },

      // ----- PARTE 2 -----
      // Audio content 1
      {
        id: "l20",
        stem: "What is the conversation mainly about?",
        transcript:
          "Student: Can I talk to you about something, Dr. Chan, about the homework for this class?\nProfessor: Sure, Morgan. What's on your mind?\nStudent: I'm wondering if the homework on the syllabus is really required. I mean, I know that you have the teaching assistants score and give feedback on it, but honestly, I don't think doing it is the best use of my time. It seems like it's just meant to keep us busy, no offense.\nProfessor: None taken. I'm surprised you're in this class, actually. It's clear that you'd be better off in a different math course. But I guess it's too late in the semester to make that kind of change.\nStudent: Yeah, I missed the deadline to switch. I have to stick it out.\nProfessor: Well, how about this? If there's a unit that actually challenges you, please do the homework so that you get some practice with the material. But as long as your quiz and test scores stay high, I'll excuse you from the assignments.\nStudent: Thanks, I appreciate it.",
        options: ["a request to stop doing some required work"],
        correctIndex: 0,
      },
      {
        id: "l21",
        stem: "According to the conversation, what does the teaching assistant do?",
        transcript:
          "Student: Can I talk to you about something, Dr. Chan, about the homework for this class?\nProfessor: Sure, Morgan. What's on your mind?\nStudent: I'm wondering if the homework on the syllabus is really required. I mean, I know that you have the teaching assistants score and give feedback on it, but honestly, I don't think doing it is the best use of my time. It seems like it's just meant to keep us busy, no offense.\nProfessor: None taken. I'm surprised you're in this class, actually. It's clear that you'd be better off in a different math course. But I guess it's too late in the semester to make that kind of change.\nStudent: Yeah, I missed the deadline to switch. I have to stick it out.\nProfessor: Well, how about this? If there's a unit that actually challenges you, please do the homework so that you get some practice with the material. But as long as your quiz and test scores stay high, I'll excuse you from the assignments.\nStudent: Thanks, I appreciate it.",
        options: ["grade the homework"],
        correctIndex: 0,
      },
      {
        id: "l22",
        stem: "Why does the professor mention a different math course?",
        transcript:
          "Student: Can I talk to you about something, Dr. Chan, about the homework for this class?\nProfessor: Sure, Morgan. What's on your mind?\nStudent: I'm wondering if the homework on the syllabus is really required. I mean, I know that you have the teaching assistants score and give feedback on it, but honestly, I don't think doing it is the best use of my time. It seems like it's just meant to keep us busy, no offense.\nProfessor: None taken. I'm surprised you're in this class, actually. It's clear that you'd be better off in a different math course. But I guess it's too late in the semester to make that kind of change.\nStudent: Yeah, I missed the deadline to switch. I have to stick it out.\nProfessor: Well, how about this? If there's a unit that actually challenges you, please do the homework so that you get some practice with the material. But as long as your quiz and test scores stay high, I'll excuse you from the assignments.\nStudent: Thanks, I appreciate it.",
        options: ["to imply his class is too easy for the woman"],
        correctIndex: 0,
      },
      {
        id: "l23",
        stem: "What does the professor say about the woman?",
        transcript:
          "Student: Can I talk to you about something, Dr. Chan, about the homework for this class?\nProfessor: Sure, Morgan. What's on your mind?\nStudent: I'm wondering if the homework on the syllabus is really required. I mean, I know that you have the teaching assistants score and give feedback on it, but honestly, I don't think doing it is the best use of my time. It seems like it's just meant to keep us busy, no offense.\nProfessor: None taken. I'm surprised you're in this class, actually. It's clear that you'd be better off in a different math course. But I guess it's too late in the semester to make that kind of change.\nStudent: Yeah, I missed the deadline to switch. I have to stick it out.\nProfessor: Well, how about this? If there's a unit that actually challenges you, please do the homework so that you get some practice with the material. But as long as your quiz and test scores stay high, I'll excuse you from the assignments.\nStudent: Thanks, I appreciate it.",
        options: ["She must remain in the class."],
        correctIndex: 0,
      },
      // Audio content 2
      {
        id: "l24",
        stem: "What problem does the student mention?",
        transcript:
          "Student: Excuse me, Ms. Reynolds. Do you have a minute? I wanted to ask about the campus bicycle storage room.\nStaff member: Sure. Is there a problem with your bike?\nStudent: Not exactly. I’ve been keeping my bike outside the dorm, but it rained a lot last week, and now the brakes aren’t working well. I heard there’s an indoor storage room, but the sign says it’s only for students who paid the transportation fee. I don’t think I paid that fee because I don’t use the campus buses.\nStaff member: That’s right. The fee covers buses, bike storage, and a few other transportation services.\nStudent: I understand, but I only need the bike room. I don’t really want to pay for the whole transportation plan if I’m not going to use the buses.\nStaff member: Usually students have to pay the full fee, but there is a limited bike-only pass. It’s cheaper, although it doesn’t include bus rides.\nStudent: I didn’t know that. Can I get one today?\nStaff member: Yes, but you’ll need to register your bike first. Fill out this form with the bike’s color, brand, and serial number. After that, we can give you a sticker and a key card for the storage room.\nStudent: Great. I’ll fill it out now.",
        options: ["His bike was damaged by the rain."],
        correctIndex: 0,
      },
      {
        id: "l25",
        stem: "Why does the student not want to pay the transportation fee?",
        transcript:
          "Student: Excuse me, Ms. Reynolds. Do you have a minute? I wanted to ask about the campus bicycle storage room.\nStaff member: Sure. Is there a problem with your bike?\nStudent: Not exactly. I’ve been keeping my bike outside the dorm, but it rained a lot last week, and now the brakes aren’t working well. I heard there’s an indoor storage room, but the sign says it’s only for students who paid the transportation fee. I don’t think I paid that fee because I don’t use the campus buses.\nStaff member: That’s right. The fee covers buses, bike storage, and a few other transportation services.\nStudent: I understand, but I only need the bike room. I don’t really want to pay for the whole transportation plan if I’m not going to use the buses.\nStaff member: Usually students have to pay the full fee, but there is a limited bike-only pass. It’s cheaper, although it doesn’t include bus rides.\nStudent: I didn’t know that. Can I get one today?\nStaff member: Yes, but you’ll need to register your bike first. Fill out this form with the bike’s color, brand, and serial number. After that, we can give you a sticker and a key card for the storage room.\nStudent: Great. I’ll fill it out now.",
        options: ["He does not use the campus buses."],
        correctIndex: 0,
      },
      {
        id: "l26",
        stem: "What does the staff member tell the student about the bike-only pass?",
        transcript:
          "Student: Excuse me, Ms. Reynolds. Do you have a minute? I wanted to ask about the campus bicycle storage room.\nStaff member: Sure. Is there a problem with your bike?\nStudent: Not exactly. I’ve been keeping my bike outside the dorm, but it rained a lot last week, and now the brakes aren’t working well. I heard there’s an indoor storage room, but the sign says it’s only for students who paid the transportation fee. I don’t think I paid that fee because I don’t use the campus buses.\nStaff member: That’s right. The fee covers buses, bike storage, and a few other transportation services.\nStudent: I understand, but I only need the bike room. I don’t really want to pay for the whole transportation plan if I’m not going to use the buses.\nStaff member: Usually students have to pay the full fee, but there is a limited bike-only pass. It’s cheaper, although it doesn’t include bus rides.\nStudent: I didn’t know that. Can I get one today?\nStaff member: Yes, but you’ll need to register your bike first. Fill out this form with the bike’s color, brand, and serial number. After that, we can give you a sticker and a key card for the storage room.\nStudent: Great. I’ll fill it out now.",
        options: ["It is cheaper but does not include bus rides."],
        correctIndex: 0,
      },
      {
        id: "l27",
        stem: "What will the student probably do next?",
        transcript:
          "Student: Excuse me, Ms. Reynolds. Do you have a minute? I wanted to ask about the campus bicycle storage room.\nStaff member: Sure. Is there a problem with your bike?\nStudent: Not exactly. I’ve been keeping my bike outside the dorm, but it rained a lot last week, and now the brakes aren’t working well. I heard there’s an indoor storage room, but the sign says it’s only for students who paid the transportation fee. I don’t think I paid that fee because I don’t use the campus buses.\nStaff member: That’s right. The fee covers buses, bike storage, and a few other transportation services.\nStudent: I understand, but I only need the bike room. I don’t really want to pay for the whole transportation plan if I’m not going to use the buses.\nStaff member: Usually students have to pay the full fee, but there is a limited bike-only pass. It’s cheaper, although it doesn’t include bus rides.\nStudent: I didn’t know that. Can I get one today?\nStaff member: Yes, but you’ll need to register your bike first. Fill out this form with the bike’s color, brand, and serial number. After that, we can give you a sticker and a key card for the storage room.\nStudent: Great. I’ll fill it out now.",
        options: ["Fill out a form to register his bike."],
        correctIndex: 0,
      },
      // Audio content 3
      {
        id: "l28",
        stem: "What is the student considering doing?",
        transcript:
          "Student: Hi, I’m calling about the photography club’s weekend trip.\nClub officer: Sure. Are you already signed up?\nStudent: Yes, but I’m thinking about canceling. I saw the schedule, and it says we’ll leave campus at five thirty in the morning. That seems really early, especially for a Saturday.\nClub officer: It is early, but there’s a reason for it. The best light for landscape photography is usually right after sunrise. If we leave later, we’ll miss the main purpose of the trip.\nStudent: I get that. I’m just worried because I work late on Friday nights. I don’t want to be exhausted the whole time.\nClub officer: That makes sense. But you should know that the first activity is optional. Some students plan to rest on the bus and join the group after breakfast.\nStudent: Oh, I didn’t realize that. I thought everyone had to start taking pictures as soon as we arrived.\nClub officer: No, not at all. The only required part is the afternoon workshop, because a guest photographer is coming to teach us how to edit outdoor photos.\nStudent: In that case, I think I’ll still go.",
        options: ["Canceling her place on the trip."],
        correctIndex: 0,
      },
      {
        id: "l29",
        stem: "According to the club officer, why will the group leave early?",
        transcript:
          "Student: Hi, I’m calling about the photography club’s weekend trip.\nClub officer: Sure. Are you already signed up?\nStudent: Yes, but I’m thinking about canceling. I saw the schedule, and it says we’ll leave campus at five thirty in the morning. That seems really early, especially for a Saturday.\nClub officer: It is early, but there’s a reason for it. The best light for landscape photography is usually right after sunrise. If we leave later, we’ll miss the main purpose of the trip.\nStudent: I get that. I’m just worried because I work late on Friday nights. I don’t want to be exhausted the whole time.\nClub officer: That makes sense. But you should know that the first activity is optional. Some students plan to rest on the bus and join the group after breakfast.\nStudent: Oh, I didn’t realize that. I thought everyone had to start taking pictures as soon as we arrived.\nClub officer: No, not at all. The only required part is the afternoon workshop, because a guest photographer is coming to teach us how to edit outdoor photos.\nStudent: In that case, I think I’ll still go.",
        options: ["To take photos in the best morning light."],
        correctIndex: 0,
      },
      {
        id: "l30",
        stem: "What was the student mistaken about?",
        transcript:
          "Student: Hi, I’m calling about the photography club’s weekend trip.\nClub officer: Sure. Are you already signed up?\nStudent: Yes, but I’m thinking about canceling. I saw the schedule, and it says we’ll leave campus at five thirty in the morning. That seems really early, especially for a Saturday.\nClub officer: It is early, but there’s a reason for it. The best light for landscape photography is usually right after sunrise. If we leave later, we’ll miss the main purpose of the trip.\nStudent: I get that. I’m just worried because I work late on Friday nights. I don’t want to be exhausted the whole time.\nClub officer: That makes sense. But you should know that the first activity is optional. Some students plan to rest on the bus and join the group after breakfast.\nStudent: Oh, I didn’t realize that. I thought everyone had to start taking pictures as soon as we arrived.\nClub officer: No, not at all. The only required part is the afternoon workshop, because a guest photographer is coming to teach us how to edit outdoor photos.\nStudent: In that case, I think I’ll still go.",
        options: ["She thought the first activity was required."],
        correctIndex: 0,
      },
      {
        id: "l31",
        stem: "What can be inferred about the student?",
        transcript:
          "Student: Hi, I’m calling about the photography club’s weekend trip.\nClub officer: Sure. Are you already signed up?\nStudent: Yes, but I’m thinking about canceling. I saw the schedule, and it says we’ll leave campus at five thirty in the morning. That seems really early, especially for a Saturday.\nClub officer: It is early, but there’s a reason for it. The best light for landscape photography is usually right after sunrise. If we leave later, we’ll miss the main purpose of the trip.\nStudent: I get that. I’m just worried because I work late on Friday nights. I don’t want to be exhausted the whole time.\nClub officer: That makes sense. But you should know that the first activity is optional. Some students plan to rest on the bus and join the group after breakfast.\nStudent: Oh, I didn’t realize that. I thought everyone had to start taking pictures as soon as we arrived.\nClub officer: No, not at all. The only required part is the afternoon workshop, because a guest photographer is coming to teach us how to edit outdoor photos.\nStudent: In that case, I think I’ll still go.",
        options: ["She is more likely to go on the trip after hearing the explanation."],
        correctIndex: 0,
      },
      // Audio content 4
      {
        id: "l32",
        stem: "What is the conversation mainly about?",
        transcript:
          "Student: Hello, I wanted to ask about the new meal plan options.\nDining manager: Of course. Are you trying to change your current plan?\nStudent: Maybe. Right now, I have the unlimited plan, but I don’t think I’m using it enough. I usually eat breakfast in my room, and on weekends I often go home. So I feel like I’m paying for meals I don’t actually eat.\nDining manager: That happens sometimes, especially with first-year students who choose the unlimited plan before they know their schedule.\nStudent: Exactly. I was wondering if I could switch to the smaller plan now, even though the semester has already started.\nDining manager: The regular deadline passed last Friday, but we allow students to change plans late if they have a clear reason. In your case, your meal records show that you’ve only been eating in the dining hall about once a day.\nStudent: So I can switch?\nDining manager: Yes, but the change won’t begin until next Monday. Also, the difference in cost will be added as credit to your student account. It won’t be returned as cash.\nStudent: That’s fine. Credit is better than wasting the money.",
        options: ["changing to a different meal plan"],
        correctIndex: 0,
      },
      {
        id: "l33",
        stem: "Why does the student want a smaller meal plan?",
        transcript:
          "Student: Hello, I wanted to ask about the new meal plan options.\nDining manager: Of course. Are you trying to change your current plan?\nStudent: Maybe. Right now, I have the unlimited plan, but I don’t think I’m using it enough. I usually eat breakfast in my room, and on weekends I often go home. So I feel like I’m paying for meals I don’t actually eat.\nDining manager: That happens sometimes, especially with first-year students who choose the unlimited plan before they know their schedule.\nStudent: Exactly. I was wondering if I could switch to the smaller plan now, even though the semester has already started.\nDining manager: The regular deadline passed last Friday, but we allow students to change plans late if they have a clear reason. In your case, your meal records show that you’ve only been eating in the dining hall about once a day.\nStudent: So I can switch?\nDining manager: Yes, but the change won’t begin until next Monday. Also, the difference in cost will be added as credit to your student account. It won’t be returned as cash.\nStudent: That’s fine. Credit is better than wasting the money.",
        options: ["He does not eat in the dining hall very often."],
        correctIndex: 0,
      },
      {
        id: "l34",
        stem: "What evidence does the dining manager mention?",
        transcript:
          "Student: Hello, I wanted to ask about the new meal plan options.\nDining manager: Of course. Are you trying to change your current plan?\nStudent: Maybe. Right now, I have the unlimited plan, but I don’t think I’m using it enough. I usually eat breakfast in my room, and on weekends I often go home. So I feel like I’m paying for meals I don’t actually eat.\nDining manager: That happens sometimes, especially with first-year students who choose the unlimited plan before they know their schedule.\nStudent: Exactly. I was wondering if I could switch to the smaller plan now, even though the semester has already started.\nDining manager: The regular deadline passed last Friday, but we allow students to change plans late if they have a clear reason. In your case, your meal records show that you’ve only been eating in the dining hall about once a day.\nStudent: So I can switch?\nDining manager: Yes, but the change won’t begin until next Monday. Also, the difference in cost will be added as credit to your student account. It won’t be returned as cash.\nStudent: That’s fine. Credit is better than wasting the money.",
        options: ["The student’s meal records."],
        correctIndex: 0,
      },
      {
        id: "l35",
        stem: "What does the dining manager say about the money difference?",
        transcript:
          "Student: Hello, I wanted to ask about the new meal plan options.\nDining manager: Of course. Are you trying to change your current plan?\nStudent: Maybe. Right now, I have the unlimited plan, but I don’t think I’m using it enough. I usually eat breakfast in my room, and on weekends I often go home. So I feel like I’m paying for meals I don’t actually eat.\nDining manager: That happens sometimes, especially with first-year students who choose the unlimited plan before they know their schedule.\nStudent: Exactly. I was wondering if I could switch to the smaller plan now, even though the semester has already started.\nDining manager: The regular deadline passed last Friday, but we allow students to change plans late if they have a clear reason. In your case, your meal records show that you’ve only been eating in the dining hall about once a day.\nStudent: So I can switch?\nDining manager: Yes, but the change won’t begin until next Monday. Also, the difference in cost will be added as credit to your student account. It won’t be returned as cash.\nStudent: That’s fine. Credit is better than wasting the money.",
        options: ["It will be added as credit to the student’s account."],
        correctIndex: 0,
      },

      // ----- PARTE 3 -----
      // Audio content 1
      {
        id: "l36",
        stem: "What is the speaker’s main objective?",
        transcript:
          "Speaker: Good morning everyone. My name is Margaret Fisher, and I'm the head of Human Resources here at MTech Industries. I'm here today to explain what you'll be doing in your job.\nAs you know, you have been selected to conduct important market research on a number of our recent products. Your main task will be to contact customers who have agreed to participate in a telephone survey and discover how satisfied they are, or are not, with the product they bought.\nWe're going to watch a video showing how to go about this important task, and then you'll learn how to record the results using the customer survey software. After that, we'll do some practice interviews.\nThen, this afternoon, it'll be time to get your feet wet. You'll be given a list of names and telephone numbers, and you'll spend the next three days contacting customers and recording their answers.\nOur main objective is getting as many results as possible, so the more clients you process, the better. We'll show you how to get the essential information as quickly as possible.\nDuring this time, some of your conversations may be recorded for training purposes.\nOn Friday afternoon, your team leader will meet with you to go through your list of contacts one by one and assess your performance in a face-to-face discussion. He or she may also refer to the recordings that were made of the conversations you had with customers.\nOK, well, I think I've said enough for now.",
        options: ["to explain some tasks to new employees"],
        correctIndex: 0,
      },
      {
        id: "l37",
        stem: "How will the employees get information from customers?",
        transcript:
          "Speaker: Good morning everyone. My name is Margaret Fisher, and I'm the head of Human Resources here at MTech Industries. I'm here today to explain what you'll be doing in your job.\nAs you know, you have been selected to conduct important market research on a number of our recent products. Your main task will be to contact customers who have agreed to participate in a telephone survey and discover how satisfied they are, or are not, with the product they bought.\nWe're going to watch a video showing how to go about this important task, and then you'll learn how to record the results using the customer survey software. After that, we'll do some practice interviews.\nThen, this afternoon, it'll be time to get your feet wet. You'll be given a list of names and telephone numbers, and you'll spend the next three days contacting customers and recording their answers.\nOur main objective is getting as many results as possible, so the more clients you process, the better. We'll show you how to get the essential information as quickly as possible.\nDuring this time, some of your conversations may be recorded for training purposes.\nOn Friday afternoon, your team leader will meet with you to go through your list of contacts one by one and assess your performance in a face-to-face discussion. He or she may also refer to the recordings that were made of the conversations you had with customers.\nOK, well, I think I've said enough for now.",
        options: ["by phone"],
        correctIndex: 0,
      },
      {
        id: "l38",
        stem: "What will employees receive at the end of the week?",
        transcript:
          "Speaker: Good morning everyone. My name is Margaret Fisher, and I'm the head of Human Resources here at MTech Industries. I'm here today to explain what you'll be doing in your job.\nAs you know, you have been selected to conduct important market research on a number of our recent products. Your main task will be to contact customers who have agreed to participate in a telephone survey and discover how satisfied they are, or are not, with the product they bought.\nWe're going to watch a video showing how to go about this important task, and then you'll learn how to record the results using the customer survey software. After that, we'll do some practice interviews.\nThen, this afternoon, it'll be time to get your feet wet. You'll be given a list of names and telephone numbers, and you'll spend the next three days contacting customers and recording their answers.\nOur main objective is getting as many results as possible, so the more clients you process, the better. We'll show you how to get the essential information as quickly as possible.\nDuring this time, some of your conversations may be recorded for training purposes.\nOn Friday afternoon, your team leader will meet with you to go through your list of contacts one by one and assess your performance in a face-to-face discussion. He or she may also refer to the recordings that were made of the conversations you had with customers.\nOK, well, I think I've said enough for now.",
        options: ["feedback on how they have done"],
        correctIndex: 0,
      },
      // Audio content 2
      {
        id: "l39",
        stem: "What is the speaker’s main purpose?",
        transcript:
          "Speaker: Good morning everyone. My name is Laura Bennett, and I’m the training coordinator here at Green Valley Community Center. I’m here today to explain what you’ll be doing as volunteers during our weekend children’s program.\nAs you know, many families in the neighborhood bring their children here on Saturdays for reading, games, and art activities. Your main responsibility will be to help the children move safely from one activity to another and make sure they have the materials they need.\nFirst, we’re going to show you around the building, including the classrooms, the art room, and the outdoor play area. After that, you’ll learn how to check children in when they arrive and how to contact a staff member if there is a problem.\nLater this morning, we’ll divide you into small groups. Each group will work with one staff member and practice helping with simple activities, such as giving out books, setting up tables, and cleaning up supplies.\nThis afternoon, you’ll begin working with the children. Each of you will receive a schedule that tells you where to be and what activity you’ll help with. Please remember that your main goal is to keep the children safe and make sure they enjoy the program.\nAt the end of the day, we’ll meet for about twenty minutes to discuss how everything went and answer any questions you may have.",
        options: ["to explain the volunteers’ responsibilities"],
        correctIndex: 0,
      },
      {
        id: "l40",
        stem: "What will the volunteers do first?",
        transcript:
          "Speaker: Good morning everyone. My name is Laura Bennett, and I’m the training coordinator here at Green Valley Community Center. I’m here today to explain what you’ll be doing as volunteers during our weekend children’s program.\nAs you know, many families in the neighborhood bring their children here on Saturdays for reading, games, and art activities. Your main responsibility will be to help the children move safely from one activity to another and make sure they have the materials they need.\nFirst, we’re going to show you around the building, including the classrooms, the art room, and the outdoor play area. After that, you’ll learn how to check children in when they arrive and how to contact a staff member if there is a problem.\nLater this morning, we’ll divide you into small groups. Each group will work with one staff member and practice helping with simple activities, such as giving out books, setting up tables, and cleaning up supplies.\nThis afternoon, you’ll begin working with the children. Each of you will receive a schedule that tells you where to be and what activity you’ll help with. Please remember that your main goal is to keep the children safe and make sure they enjoy the program.\nAt the end of the day, we’ll meet for about twenty minutes to discuss how everything went and answer any questions you may have.",
        options: ["tour the building"],
        correctIndex: 0,
      },
      {
        id: "l41",
        stem: "What will happen at the end of the day?",
        transcript:
          "Speaker: Good morning everyone. My name is Laura Bennett, and I’m the training coordinator here at Green Valley Community Center. I’m here today to explain what you’ll be doing as volunteers during our weekend children’s program.\nAs you know, many families in the neighborhood bring their children here on Saturdays for reading, games, and art activities. Your main responsibility will be to help the children move safely from one activity to another and make sure they have the materials they need.\nFirst, we’re going to show you around the building, including the classrooms, the art room, and the outdoor play area. After that, you’ll learn how to check children in when they arrive and how to contact a staff member if there is a problem.\nLater this morning, we’ll divide you into small groups. Each group will work with one staff member and practice helping with simple activities, such as giving out books, setting up tables, and cleaning up supplies.\nThis afternoon, you’ll begin working with the children. Each of you will receive a schedule that tells you where to be and what activity you’ll help with. Please remember that your main goal is to keep the children safe and make sure they enjoy the program.\nAt the end of the day, we’ll meet for about twenty minutes to discuss how everything went and answer any questions you may have.",
        options: ["the volunteers will discuss how the program went"],
        correctIndex: 0,
      },
      // Audio content 3
      {
        id: "l42",
        stem: "Why will the bookstore be busy?",
        transcript:
          "Speaker: Hello everyone. My name is Daniel Carter, and I’m the manager of the university bookstore. I’d like to welcome all of you to your first day of work.\nDuring the next two weeks, the store will be very busy because students will be buying books for the new semester. Your main job will be to help customers find the correct textbooks for their classes.\nThis morning, I’ll show you how the textbooks are organized. They are arranged by department, course number, and professor’s name. It’s important that you check all three pieces of information before giving a book to a student.\nAfter that, you’ll learn how to use the store’s computer system. The system will tell you whether a book is available, how many copies we have, and whether there are used copies for a lower price.\nThis afternoon, each of you will work with an experienced employee. You’ll practice answering questions, finding books, and taking students to the correct shelves.\nAt the end of your first week, I’ll meet with each of you individually to talk about your progress and answer any questions about your job.",
        options: ["students will be buying books for the new semester"],
        correctIndex: 0,
      },
      {
        id: "l43",
        stem: "How are the textbooks organized?",
        transcript:
          "Speaker: Hello everyone. My name is Daniel Carter, and I’m the manager of the university bookstore. I’d like to welcome all of you to your first day of work.\nDuring the next two weeks, the store will be very busy because students will be buying books for the new semester. Your main job will be to help customers find the correct textbooks for their classes.\nThis morning, I’ll show you how the textbooks are organized. They are arranged by department, course number, and professor’s name. It’s important that you check all three pieces of information before giving a book to a student.\nAfter that, you’ll learn how to use the store’s computer system. The system will tell you whether a book is available, how many copies we have, and whether there are used copies for a lower price.\nThis afternoon, each of you will work with an experienced employee. You’ll practice answering questions, finding books, and taking students to the correct shelves.\nAt the end of your first week, I’ll meet with each of you individually to talk about your progress and answer any questions about your job.",
        options: ["by department, course number, and professor’s name"],
        correctIndex: 0,
      },
      {
        id: "l44",
        stem: "Who will the new employees work with this afternoon?",
        transcript:
          "Speaker: Hello everyone. My name is Daniel Carter, and I’m the manager of the university bookstore. I’d like to welcome all of you to your first day of work.\nDuring the next two weeks, the store will be very busy because students will be buying books for the new semester. Your main job will be to help customers find the correct textbooks for their classes.\nThis morning, I’ll show you how the textbooks are organized. They are arranged by department, course number, and professor’s name. It’s important that you check all three pieces of information before giving a book to a student.\nAfter that, you’ll learn how to use the store’s computer system. The system will tell you whether a book is available, how many copies we have, and whether there are used copies for a lower price.\nThis afternoon, each of you will work with an experienced employee. You’ll practice answering questions, finding books, and taking students to the correct shelves.\nAt the end of your first week, I’ll meet with each of you individually to talk about your progress and answer any questions about your job.",
        options: ["experienced employees"],
        correctIndex: 0,
      },
      // Audio content 4
      {
        id: "l45",
        stem: "What event is the speaker discussing?",
        transcript:
          "Speaker: Good afternoon. My name is Rachel Kim, and I’m the director of student activities. Thank you for helping with this year’s international food festival.\nThe festival will take place this Friday evening in the main student hall. Students from different countries will prepare traditional dishes, and visitors will be able to try small samples of the food.\nYour main responsibility will be to help the event run smoothly. Some of you will welcome visitors at the entrance, while others will help students set up their tables. A few volunteers will also be responsible for keeping the walkways clear.\nIn a few minutes, I’ll give each of you a map of the hall. The map shows where each country’s table will be located and where visitors should enter and exit.\nAfter that, we’ll walk through the hall together so you can see where everything will be. Then we’ll practice answering common questions, such as where the restrooms are and what time the performances begin.\nAfter the festival, please stay for about thirty minutes to help clean the tables and collect signs. Your help is very important to the success of this event.",
        options: ["an international food festival"],
        correctIndex: 0,
      },
      {
        id: "l46",
        stem: "What will the volunteers receive?",
        transcript:
          "Speaker: Good afternoon. My name is Rachel Kim, and I’m the director of student activities. Thank you for helping with this year’s international food festival.\nThe festival will take place this Friday evening in the main student hall. Students from different countries will prepare traditional dishes, and visitors will be able to try small samples of the food.\nYour main responsibility will be to help the event run smoothly. Some of you will welcome visitors at the entrance, while others will help students set up their tables. A few volunteers will also be responsible for keeping the walkways clear.\nIn a few minutes, I’ll give each of you a map of the hall. The map shows where each country’s table will be located and where visitors should enter and exit.\nAfter that, we’ll walk through the hall together so you can see where everything will be. Then we’ll practice answering common questions, such as where the restrooms are and what time the performances begin.\nAfter the festival, please stay for about thirty minutes to help clean the tables and collect signs. Your help is very important to the success of this event.",
        options: ["a map of the hall"],
        correctIndex: 0,
      },
      {
        id: "l47",
        stem: "What will volunteers do after the festival?",
        transcript:
          "Speaker: Good afternoon. My name is Rachel Kim, and I’m the director of student activities. Thank you for helping with this year’s international food festival.\nThe festival will take place this Friday evening in the main student hall. Students from different countries will prepare traditional dishes, and visitors will be able to try small samples of the food.\nYour main responsibility will be to help the event run smoothly. Some of you will welcome visitors at the entrance, while others will help students set up their tables. A few volunteers will also be responsible for keeping the walkways clear.\nIn a few minutes, I’ll give each of you a map of the hall. The map shows where each country’s table will be located and where visitors should enter and exit.\nAfter that, we’ll walk through the hall together so you can see where everything will be. Then we’ll practice answering common questions, such as where the restrooms are and what time the performances begin.\nAfter the festival, please stay for about thirty minutes to help clean the tables and collect signs. Your help is very important to the success of this event.",
        options: ["help clean up"],
        correctIndex: 0,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // GRAMMAR
  // ---------------------------------------------------------------------------
  {
    kind: "grammar",
    title: "Grammar",
    items: [
      {
        id: "g1",
        stem: "The manager asked the employees __________ the report before Friday.",
        options: ["finish", "finishing", "to finish", "finished"],
        correctIndex: 2,
      },
      {
        id: "g2",
        stem: "It has become common for college students __________ abroad before graduation.",
        options: ["study", "studying", "to study", "studied"],
        correctIndex: 2,
      },
      {
        id: "g3",
        stem: "Neither the students nor the teacher __________ aware of the schedule change.",
        options: ["were", "was", "have been", "are being"],
        correctIndex: 1,
      },
      {
        id: "g4",
        stem: "I wish I __________ more time to prepare for the interview.",
        options: ["have", "had", "will have", "would have"],
        correctIndex: 1,
      },
      {
        id: "g5",
        stem: "The supervisor explained to the new staff what __________.",
        options: [
          "were their responsibilities",
          "their responsibilities were",
          "their responsibilities are being",
          "did their responsibilities be",
        ],
        correctIndex: 1,
      },
      {
        id: "g6",
        stem: "The article __________ we discussed in class was written by a famous journalist.",
        options: ["who", "whose", "that", "where"],
        correctIndex: 2,
      },
      {
        id: "g7",
        stem: "By the time the guests arrived, Maria __________ dinner.",
        options: ["has already cooked", "had already cooked", "already cooks", "was already cook"],
        correctIndex: 1,
      },
      {
        id: "g8",
        stem: "If a customer cancels a reservation __________, the hotel may charge extra fees.",
        options: ["for any reason", "because any reason", "by any reason", "with any reason"],
        correctIndex: 0,
      },
      {
        id: "g9",
        stem: "The new software is much easier to use __________ the previous version.",
        options: ["as", "than", "from", "like"],
        correctIndex: 1,
      },
      {
        id: "g10",
        stem: "The professor suggested that the student __________ the essay one more time.",
        options: ["revises", "revised", "revise", "has revised"],
        correctIndex: 2,
      },
      {
        id: "g11",
        stem: "We could not hear the announcement because there was __________ noise in the hallway.",
        options: ["too many", "too much", "much too", "many too"],
        correctIndex: 1,
      },
      {
        id: "g12",
        stem: "The company will hire more workers if demand __________ next month.",
        options: ["increases", "will increase", "increased", "would increase"],
        correctIndex: 0,
      },
      {
        id: "g13",
        stem: "The woman __________ car was blocking the entrance apologized immediately.",
        options: ["who", "whom", "whose", "which"],
        correctIndex: 2,
      },
      {
        id: "g14",
        stem: "This is the first time Daniel __________ a speech in front of such a large audience.",
        options: ["gives", "gave", "has given", "had given"],
        correctIndex: 2,
      },
      {
        id: "g15",
        stem: "The instructions were not clear enough for us __________ the machine correctly.",
        options: ["use", "using", "to use", "used"],
        correctIndex: 2,
      },
      {
        id: "g16",
        stem: "Had I known about the meeting earlier, I __________ my plans.",
        options: ["change", "will change", "would change", "would have changed"],
        correctIndex: 3,
      },
      {
        id: "g17",
        stem: "The children were told not to leave the classroom __________ the bell rang.",
        options: ["until", "since", "during", "while"],
        correctIndex: 0,
      },
      {
        id: "g18",
        stem: "Several applicants __________ interviewed before the final decision was made.",
        options: ["were", "was", "have", "had"],
        correctIndex: 0,
      },
      {
        id: "g19",
        stem: "The movie was __________ interesting that we watched it twice.",
        options: ["such", "so", "too", "enough"],
        correctIndex: 1,
      },
      {
        id: "g20",
        stem: "Mr. Peterson has lived in Canada __________ he graduated from college.",
        options: ["for", "since", "during", "by"],
        correctIndex: 1,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // READING (only Text 1 and Text 2)
  // ---------------------------------------------------------------------------
  {
    kind: "reading",
    title: "Reading",
    passages: [
      {
        id: "r1",
        title: "This passage is about an urban renewal project.",
        text: "In the heart of New York City, a unique public park known as the High Line offers a quiet escape above the noisy streets. Originally constructed in the 1930s as an elevated railway, it was designed to transport goods directly to factories and warehouses, keeping dangerous freight trains off the pedestrian-filled avenues. However, with the rise of the interstate highway system and the trucking industry in the 1950s, rail traffic decreased significantly. By 1980, the train line had become obsolete and was eventually abandoned, left to be overtaken by wild plants and weeds.\n\nFor decades, the structure was viewed as an eyesore, and city officials made plans to demolish it. However, in 1999, a group of local residents formed a community organization to advocate for its preservation. They proposed transforming the industrial relic into an elevated green space. Inspired by a similar project in Paris, the organization successfully raised funds and collaborated with landscape architects to design a park that honored the railway's history while providing a modern recreational area.\n\nToday, the High Line is a massive success, attracting millions of visitors annually. It features curated gardens, art installations, and performance spaces. While the park has been praised for its innovative design and environmental benefits, it has also sparked controversy. The popularity of the High Line has led to rapid gentrification in the surrounding neighborhoods, driving up property values and forcing out longtime residents and small businesses who can no longer afford the rent.",
        items: [
          {
            id: "r1q1",
            stem: "What is the passage mostly about?",
            options: [
              "the history of the interstate highway system",
              "the transformation of an old railway into a park",
              "how to design elevated green spaces",
              "the negative impacts of tourism in New York",
            ],
            correctIndex: 1,
          },
          {
            id: "r1q2",
            stem: "In the last sentence of paragraph 1, which word is closest in meaning to obsolete?",
            options: ["dangerous", "modern", "outdated", "expensive"],
            correctIndex: 2,
          },
          {
            id: "r1q3",
            stem: "Why was the High Line originally built?",
            options: [
              "to attract tourists to factories",
              "to provide a quiet escape for residents",
              "to separate freight trains from pedestrians",
              "to support the growing trucking industry",
            ],
            correctIndex: 2,
          },
          {
            id: "r1q4",
            stem: "In the second sentence of paragraph 2, what does the word it refer to?",
            options: ["structure", "eyesore", "organization", "preservation"],
            correctIndex: 0,
          },
          {
            id: "r1q5",
            stem: "What does the author suggest about the success of the High Line?",
            options: [
              "It has primarily benefited small businesses.",
              "It had unintended negative economic consequences for some.",
              "It proved that elevated railways are still useful for freight.",
              "It caused city officials to build more highways.",
            ],
            correctIndex: 1,
          },
        ],
      },
      {
        id: "r2",
        title: "This passage is about the effects of artificial light.",
        text: "For billions of years, life on Earth has existed with a predictable rhythm of light and dark. However, the invention of the electric light bulb dramatically altered this natural cycle. Today, artificial light from streetlamps, office buildings, and residential homes creates a phenomenon known as light pollution. While it allows humans to remain active well into the night, light pollution has proven to be highly disruptive to local ecosystems, particularly for nocturnal animals and migratory birds.\n\nMany species of birds migrate at night to avoid predators and take advantage of cooler temperatures. To navigate, they rely on the natural light of the moon and the stars. Unfortunately, the intense glow of urban centers can easily disorient them. Drawn to the artificial light, birds often fly directly into city skylines. This confusion can lead to fatal collisions with illuminated glass buildings or cause the birds to circle endlessly until they drop from exhaustion. Estimates suggest that millions of birds perish each year due to light-induced incidents in North America alone.\n\nIn response to this ecological threat, conservationists have introduced \"Lights Out\" programs in several major cities. These initiatives encourage building owners and managers to turn off or dim unnecessary exterior and interior lighting during peak migration seasons. Not only do these efforts significantly reduce bird mortality rates, but they also lower energy consumption and decrease greenhouse gas emissions. As awareness grows, more communities are realizing that darkness is just as essential to a healthy environment as light.",
        items: [
          {
            id: "r2q1",
            stem: "What is the main idea of the passage?",
            options: [
              "Artificial light is necessary for human activity at night.",
              "Light pollution harms wildlife, but solutions are being implemented.",
              "Birds migrate at night to avoid predators and heat.",
              "\"Lights Out\" programs save companies money on energy.",
            ],
            correctIndex: 1,
          },
          {
            id: "r2q2",
            stem: "In paragraph 2, why does the author mention the moon and stars?",
            options: [
              "to explain how light pollution is measured",
              "to describe the natural navigation tools of migratory birds",
              "to show why urban centers are brightly lit",
              "to highlight the beauty of the night sky",
            ],
            correctIndex: 1,
          },
          {
            id: "r2q3",
            stem: "In the third sentence of paragraph 2, what does them refer to?",
            options: ["predators", "cooler temperatures", "migratory birds", "urban centers"],
            correctIndex: 2,
          },
          {
            id: "r2q4",
            stem: "What is one additional benefit of the \"Lights Out\" programs mentioned in the text?",
            options: [
              "They help scientists track bird populations.",
              "They make cities safer for pedestrians.",
              "They help reduce negative impacts on the climate.",
              "They encourage more people to go outside at night.",
            ],
            correctIndex: 2,
          },
          {
            id: "r2q5",
            stem: "In the fourth sentence of paragraph 2, which word could replace fatal?",
            options: ["deadly", "accidental", "frequent", "surprising"],
            correctIndex: 0,
          },
        ],
      },

      // ----- PACK 1 (pasajes en imagen) -----
      {
        id: "rp1a",
        title: "Pack 1 · Passage 1",
        imageUrl: "/seed/pack1-1.png",
        items: [
          {
            id: "rp1a-q1",
            stem: "What is the main purpose of this section?",
            options: [
              "to explain who can join an event",
              "to advertise a public meeting",
              "to introduce a politician",
              "to encourage people to vote",
            ],
            correctIndex: 3,
          },
          {
            id: "rp1a-q2",
            stem: "In the last question in the advertisement, which word could best replace “make it”?",
            options: ["create", "decide", "prepare", "visit"],
            correctIndex: 3,
          },
        ],
      },
      {
        id: "rp1b",
        title: "Pack 1 · Passage 2",
        imageUrl: "/seed/pack1-2.png",
        items: [
          {
            id: "rp1b-q1",
            stem: "What has recently changed in Langford?",
            options: [
              "the quality of education has improved",
              "more police officers were hired",
              "public services have become inefficient",
              "the city decided to increase taxes",
            ],
            correctIndex: 0,
          },
          {
            id: "rp1b-q2",
            stem: "What does Doris Clarke think is important for anyone running the city?",
            options: [
              "find ways to add money to the city’s budget",
              "gain the support of police and teachers",
              "be realistic in your goals",
              "cut taxes to save money",
            ],
            correctIndex: 2,
          },
          {
            id: "rp1b-q3",
            stem: "What is the main topic of this section?",
            options: [
              "the results of an election",
              "the responsibilities of a mayor",
              "a major problem in a city",
              "a description of a candidate",
            ],
            correctIndex: 3,
          },
          {
            id: "rp1b-q4",
            stem: "What does Doris Clarke say will be her first priority if elected again?",
            options: [
              "providing water service to more regions",
              "eliminating unneeded social programs",
              "installing new pipes in some areas",
              "lowering the cost of healthcare for all",
            ],
            correctIndex: 2,
          },
          {
            id: "rp1b-q5",
            stem: "In the last sentence, which phrase could replace “a proven track record”?",
            options: [
              "a history of success",
              "an organized plan",
              "an educational background",
              "a strong belief",
            ],
            correctIndex: 0,
          },
        ],
      },
      {
        id: "rp1c",
        title: "Pack 1 · Passage 3",
        imageUrl: "/seed/pack1-3.png",
        items: [
          {
            id: "rp1c-q1",
            stem: "What best describes the main idea of the article?",
            options: [
              "Tactics for becoming elected have ancient roots.",
              "Focusing on one’s strengths is key to winning elections.",
              "Marcus Cicero influenced other Roman politicians.",
              "Roman politicians were crueler to each other than today’s politicians.",
            ],
            correctIndex: 0,
          },
          {
            id: "rp1c-q2",
            stem: "In the first sentence of paragraph 2, what does “them” refer to?",
            options: [
              "politicians in ancient Rome",
              "modern political campaigns",
              "differences of the era",
              "the ideas in an essay",
            ],
            correctIndex: 3,
          },
          {
            id: "rp1c-q3",
            stem: "What did Quintus Cicero believe was natural for an elected leader?",
            options: [
              "to overestimate what they can achieve",
              "to want to fulfill the desires of the public",
              "to feel displeased when losing popularity",
              "to not fulfill their campaign commitments",
            ],
            correctIndex: 3,
          },
          {
            id: "rp1c-q4",
            stem: "What does the author think about the Cicero brothers?",
            options: [
              "Quintus Cicero wrote the political essay.",
              "Quintus Cicero wrote more memorable essays than his brother.",
              "Marcus Cicero was a notable political figure.",
              "Marcus Cicero was a better leader than his brother.",
            ],
            correctIndex: 2,
          },
          {
            id: "rp1c-q5",
            stem: "Which strategy mentioned in section C does Doris Clarke seem to support?",
            options: [
              "compromising personal beliefs to win votes",
              "spreading negative news",
              "doing research on political opponents",
              "making too many promises",
            ],
            correctIndex: 2,
          },
        ],
      },

      // ----- PACK 2 (pasajes en imagen) -----
      {
        id: "rp2a",
        title: "Pack 2 · Passage 1",
        imageUrl: "/seed/pack2-1.jpeg",
        items: [
          {
            id: "rp2a-q1",
            stem: "What is the main purpose of this passage?",
            options: [
              "to explain how robots are used in modern classrooms",
              "to advertise lessons in robotics and simple engineering",
              "to describe the parts needed to build a robot",
              "to compare coding lessons with design lessons",
            ],
            correctIndex: 1,
          },
          {
            id: "rp2a-q2",
            stem: "In the first paragraph, what does the phrase “hands-on lessons” suggest?",
            options: [
              "students will mainly watch instructors build robots",
              "students will practice using the skills they are taught",
              "students will study robotics without working in groups",
              "students will only learn from written instructions",
            ],
            correctIndex: 1,
          },
          {
            id: "rp2a-q3",
            stem: "What is said about people with different experience levels?",
            options: [
              "Only advanced builders can attend the lab sessions.",
              "Beginners must already know how to code before joining.",
              "Lessons are offered for both new and experienced students.",
              "Students are placed in classes based only on their age.",
            ],
            correctIndex: 2,
          },
        ],
      },
      {
        id: "rp2b",
        title: "Pack 2 · Passage 2",
        imageUrl: "/seed/pack2-2.jpeg",
        items: [
          {
            id: "rp2b-q1",
            stem: "What is the main topic of this passage?",
            options: [
              "why robotics programs are becoming more common",
              "how students prepare for robotics competitions",
              "why schools are replacing science classes with clubs",
              "how machines respond to commands in classrooms",
            ],
            correctIndex: 0,
          },
          {
            id: "rp2b-q2",
            stem: "According to paragraph 1, what do supporters say robotics is not only about?",
            options: ["working in teams", "building devices", "solving problems", "learning commands"],
            correctIndex: 1,
          },
          {
            id: "rp2b-q3",
            stem: "Why does the author mention patience, creativity, and confidence?",
            options: [
              "to show that robotics develops personal skills as well as technical skills",
              "to explain why robotics is easier than other school activities",
              "to suggest that students should focus less on science and technology",
              "to prove that robotics clubs are mainly for artistic students",
            ],
            correctIndex: 0,
          },
          {
            id: "rp2b-q4",
            stem: "In paragraph 3, what does the word “them” refer to?",
            options: [
              "competitions",
              "robotics clubs",
              "the skills students learn",
              "educators around the world",
            ],
            correctIndex: 2,
          },
          {
            id: "rp2b-q5",
            stem: "What does the author predict in the final paragraph?",
            options: [
              "Robotics programs will probably continue to grow in schools.",
              "Robotics clubs will become useful only for future careers.",
              "Educators will stop using robotics to teach critical thinking.",
              "Competitions will become the only reason students join robotics.",
            ],
            correctIndex: 0,
          },
        ],
      },
      {
        id: "rp2c",
        title: "Pack 2 · Passage 3",
        imageUrl: "/seed/pack2-3.jpeg",
        items: [
          {
            id: "rp2c-q1",
            stem: "What is the passage mainly about?",
            options: [
              "how robotics practice helps students build problem-solving skills and confidence",
              "why students often prefer robotics to other school subjects",
              "how teachers choose difficult robotics projects for advanced students",
              "why mistakes should be avoided when building machines",
            ],
            correctIndex: 0,
          },
          {
            id: "rp2c-q2",
            stem: "In paragraph 1, what does “this” refer to in the sentence “At first, this can feel difficult”?",
            options: [
              "making repeated changes while solving problems",
              "building robots only with a teacher’s help",
              "studying science without using technology",
              "finishing a project without testing ideas",
            ],
            correctIndex: 0,
          },
          {
            id: "rp2c-q3",
            stem: "Why does the author mention a student who once struggled to complete a simple design?",
            options: [
              "to show that students can improve through gradual practice",
              "to explain why simple designs are usually unsuccessful",
              "to argue that robotics should begin with difficult projects",
              "to show that confidence is more important than fixing errors",
            ],
            correctIndex: 0,
          },
          {
            id: "rp2c-q4",
            stem: "According to paragraph 3, how can robotics skills be useful outside robotics class?",
            options: [
              "They help students avoid working with other people.",
              "They help students solve problems carefully in different situations.",
              "They allow students to succeed without preparation or feedback.",
              "They make students focus only on future engineering jobs.",
            ],
            correctIndex: 1,
          },
          {
            id: "rp2c-q5",
            stem: "What opinion does the author express in the conclusion?",
            options: [
              "Robotics becomes valuable because it helps students manage mistakes and build confidence.",
              "Robotics is useful only when students can build machines without errors.",
              "Robotics should be treated as an exciting subject but not as a practical skill.",
              "Robotics practice removes the need for preparation and feedback.",
            ],
            correctIndex: 0,
          },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // SPEAKING (grabación de voz — no auto-calificado, revisión manual)
  // ---------------------------------------------------------------------------
  {
    kind: "speaking",
    title: "Speaking",
    intro:
      "Graba tu respuesta en voz para cada tarea. Las grabaciones se guardan para revisión (esta sección no se califica automáticamente).",
    speakingTasks: [
      {
        id: "sp1",
        prompt: "Task 1 — Describe the picture.",
        imageUrl: "/seed/speaking-1.jpeg",
      },
      {
        id: "sp2",
        prompt: "Task 2 — Tell me about a time when you visited a library or a quiet place to study.",
      },
      {
        id: "sp3",
        prompt:
          "Task 3 — Some people prefer studying in quiet places such as libraries. Others prefer studying at home or in places with more noise. Which do you prefer? Give your opinion and reasons to support it.",
      },
      {
        id: "sp4",
        prompt:
          "Task 4 — Your school is planning to keep the library open later in the evening so students can study after classes. They want students to help organize books and keep the place clean. What are the advantages and disadvantages of this idea?",
      },
      {
        id: "sp5",
        prompt:
          "Task 5 — A local school is planning to require all students to spend one hour each week in the library reading or studying. Some students think this rule is unnecessary because they already study at home. I am the school principal. Tell me what you think about this and try to convince me to agree with you.",
      },
    ],
  },
];
