// src/services/QuizHub/LiveQuizHubService.ts
import { HubConnection, HubConnectionBuilder, HubConnectionState } from "@microsoft/signalr";

class LiveQuizHubService {
  private connection: HubConnection | null = null;
  private isConnecting = false;

  async startConnection(roomCode: string, userName: string) {
  if (this.connection?.state === HubConnectionState.Connected) {
    console.log("✅ Veza već postoji.");
    return;
  }

  if (this.isConnecting || this.connection?.state === HubConnectionState.Connecting) {
    console.log("⏳ Već se pokušava povezivanje...");
    return;
  }

  
  if (this.connection && this.connection.state !== HubConnectionState.Disconnected) {
    try {
      await this.connection.stop();
      console.log("🧹 Prethodna konekcija prekinuta.");
    } catch (err) {
      console.warn("⚠️ Greška pri zaustavljanju prethodne konekcije:", err);
    }
  }

  this.isConnecting = true;

  this.connection = new HubConnectionBuilder()
    .withUrl(`http://localhost:5087/quizhub?roomCode=${roomCode}&userName=${userName}`, {
      accessTokenFactory: () => localStorage.getItem("token") || ""
    })
    .withAutomaticReconnect()
    .build();

  let connected = false;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await this.connection.start();
      console.log("✅ SignalR Connected");
      await this.connection.invoke("JoinRoom", roomCode, userName);
      connected = true;
      break;
    } catch (err) {
      console.warn(`🔁 SignalR connection attempt ${attempt} failed`, err);
      await new Promise(res => setTimeout(res, 1000));
    }
  }

  this.isConnecting = false;

  if (!connected) {
    console.error("❌ SignalR connection failed after multiple attempts");
  }
}


  onReceiveQuestion(callback: (question: any) => void) {
    this.connection?.off("ReceiveQuestion");
    this.connection?.on("ReceiveQuestion", callback);
  }

  onUpdateLeaderboard(callback: (leaderboard: any[]) => void) {
    this.connection?.off("UpdateLeaderboard");
    this.connection?.on("UpdateLeaderboard", callback);
  }

  onQuizStarted(callback: () => void) {
    this.connection?.off("QuizStarted")
    this.connection?.on("QuizStarted", callback);
  }

  onQuizEnded(callback: () => void) {
    this.connection?.off("QuizEnded");
    this.connection?.on("QuizEnded", callback);
  }

  onUserJoined(callback: (userName: string) => void) {
    this.connection?.off("UserJoined");
    this.connection?.on("UserJoined", callback);
  }

  onUsersUpdated(callback: (usernames: string[]) => void) {
    this.connection?.off("UsersUpdated");
    this.connection?.on("UsersUpdated", callback);
  }

  joinRoom(roomCode: string, userName: string) {
    this.connection?.invoke("JoinRoom", roomCode, userName);
  }

    sendAnswer(
  roomCode: string,
  userId: number,
  questionId: number,
  selectedOptionIds: number[] = [],
  textAnswer: string,
  durationMs: number
) {
  if (!this.connection || this.connection.state !== HubConnectionState.Connected) {
    console.error("Ne postoji aktivna konekcija za slanje odgovora.");
    return;
  }

  const submitAnswerDto = {
    roomCode,
    userId,
    questionId,
    selectedOptionIds,
    textAnswer,
    durationMs,
  };

  this.connection
    .invoke("SubmitAnswer", submitAnswerDto)
    .catch((err) => console.error("Greška pri slanju odgovora:", err));
}






  async stopConnection() {
    if (this.connection && this.connection.state !== HubConnectionState.Disconnected) {
      await this.connection.stop();
      console.log("🔌 SignalR konekcija zaustavljena.");
    }
  }

  startQuiz(roomCode: string) {
    this.connection?.invoke("StartQuiz", roomCode)
      .catch(err => console.error("Greška pri StartQuiz invoke:", err));
  }
}

const liveQuizHubService = new LiveQuizHubService();
export default liveQuizHubService;
