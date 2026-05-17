import { Switch, Route } from "wouter";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Agent from "./pages/Agent";
import Topics from "./pages/Topics";
import Exams from "./pages/Exams";
import WrongAnswers from "./pages/WrongAnswers";
import Notes from "./pages/Notes";
import Chat from "./pages/Chat";
import Resources from "./pages/Resources";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/agent" component={Agent} />
        <Route path="/topics" component={Topics} />
        <Route path="/exams" component={Exams} />
        <Route path="/wrong-answers" component={WrongAnswers} />
        <Route path="/notes" component={Notes} />
        <Route path="/chat" component={Chat} />
        <Route path="/chat/:id" component={Chat} />
        <Route path="/resources" component={Resources} />
        <Route path="/settings" component={Settings} />
        <Route>
          <div className="flex items-center justify-center h-full text-gray-400">404 — Sayfa bulunamadı</div>
        </Route>
      </Switch>
    </Layout>
  );
}
