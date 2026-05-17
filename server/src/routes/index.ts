import { Router, type IRouter } from "express";
import healthRouter from "./health";
import settingsRouter from "./settings";
import topicsRouter from "./topics";
import resourcesRouter from "./resources";
import chatRouter from "./chat";
import dashboardRouter from "./dashboard";
import wrongAnswersRouter from "./wrong-answers";
import examsRouter from "./exams";
import notesRouter from "./notes";
import aiChatRouter from "./ai-chat";
import aiAgentRouter from "./ai-agent";

const router: IRouter = Router();

router.use(healthRouter);
router.use(settingsRouter);
router.use(topicsRouter);
router.use(resourcesRouter);
router.use(chatRouter);
router.use(dashboardRouter);
router.use(wrongAnswersRouter);
router.use(examsRouter);
router.use(notesRouter);
router.use(aiChatRouter);
router.use(aiAgentRouter);

export default router;
