import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Clock, Play, BookOpen } from "lucide-react"

interface VideoLesson {
  id: string
  title: string
  description: string
  duration: string
  chapter: number
  completed: boolean
  track: string
}

export default function Lessons() {
  const videoLessons: VideoLesson[] = [
    {
      id: "1",
      title: "Introdução ao React",
      description: "Conceitos básicos e setup do ambiente",
      duration: "30min",
      chapter: 1,
      completed: true,
      track: "React Fundamentals",
    },
    {
      id: "2",
      title: "Componentes e Props",
      description: "Aprenda a criar componentes reutilizáveis",
      duration: "45min",
      chapter: 2,
      completed: true,
      track: "React Fundamentals",
    },
    {
      id: "3",
      title: "Estado e Eventos",
      description: "Gerenciamento de estado e manipulação de eventos",
      duration: "60min",
      chapter: 3,
      completed: false,
      track: "React Fundamentals",
    },
    {
      id: "4",
      title: "Hooks em React",
      description: "Aprenda a usar hooks para gerenciar o estado e o ciclo de vida",
      duration: "75min",
      chapter: 1,
      completed: false,
      track: "React Avançado",
    },
    {
      id: "5",
      title: "Context API",
      description: "Compartilhamento de estado entre componentes",
      duration: "90min",
      chapter: 2,
      completed: false,
      track: "React Avançado",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Videoaulas</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-medium">Progresso: 45%</span>
          </div>
          <Progress value={45} className="w-32" />
        </div>
      </div>

      <Tabs defaultValue="react-fundamentals" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="react-fundamentals">React Fundamentals</TabsTrigger>
          <TabsTrigger value="react-advanced">React Avançado</TabsTrigger>
          <TabsTrigger value="node-backend">Node.js Backend</TabsTrigger>
        </TabsList>

        <TabsContent value="react-fundamentals" className="space-y-4">
          {videoLessons
            .filter((lesson) => lesson.track === "React Fundamentals")
            .map((lesson) => (
              <Card key={lesson.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          lesson.completed ? "bg-green-500" : "bg-gray-200"
                        }`}
                      >
                        {lesson.completed ? (
                          <span className="text-white font-bold">✓</span>
                        ) : (
                          <span className="text-gray-600 font-bold">{lesson.chapter}</span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{lesson.title}</h3>
                        <p className="text-gray-600">{lesson.description}</p>
                        <div className="flex items-center space-x-4 mt-2">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">{lesson.duration}</span>
                          </div>
                          <Badge variant="outline">Capítulo {lesson.chapter}</Badge>
                        </div>
                      </div>
                    </div>
                    <Button variant={lesson.completed ? "outline" : "default"}>
                      <Play className="h-4 w-4 mr-2" />
                      {lesson.completed ? "Revisar" : "Assistir"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="react-advanced" className="space-y-4">
          {videoLessons
            .filter((lesson) => lesson.track === "React Avançado")
            .map((lesson) => (
              <Card key={lesson.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          lesson.completed ? "bg-green-500" : "bg-gray-200"
                        }`}
                      >
                        {lesson.completed ? (
                          <span className="text-white font-bold">✓</span>
                        ) : (
                          <span className="text-gray-600 font-bold">{lesson.chapter}</span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{lesson.title}</h3>
                        <p className="text-gray-600">{lesson.description}</p>
                        <div className="flex items-center space-x-4 mt-2">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">{lesson.duration}</span>
                          </div>
                          <Badge variant="outline">Capítulo {lesson.chapter}</Badge>
                        </div>
                      </div>
                    </div>
                    <Button variant={lesson.completed ? "outline" : "default"}>
                      <Play className="h-4 w-4 mr-2" />
                      {lesson.completed ? "Revisar" : "Assistir"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="node-backend">
          <Card>
            <CardContent className="p-6 text-center">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Em breve</h3>
              <p className="text-gray-600">Trilha de Node.js Backend em desenvolvimento</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}