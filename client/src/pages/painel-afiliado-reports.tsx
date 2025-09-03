import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AffiliateLayout } from "@/components/affiliate/affiliate-layout";
import { FileText, Download, Calendar, TrendingUp } from "lucide-react";

export function PainelAfiliadoReports() {
  return (
    <AffiliateLayout activeSection="reports">
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-gray-950 to-gray-900 rounded-xl p-6 border border-gray-700"
        >
          <h1 className="text-3xl font-bold text-white mb-2">Relatórios</h1>
          <p className="text-gray-400">
            Gere e baixe relatórios detalhados do seu desempenho
          </p>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-gray-900 to-gray-950 border-gray-700 hover:border-gray-600 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-900/40 rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-sm text-gray-400">Período</p>
              </div>
              <p className="text-2xl font-bold text-white">Janeiro 2025</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-900 to-gray-950 border-gray-700 hover:border-gray-600 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-900/40 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-[#00E880]" />
                </div>
                <p className="text-sm text-gray-400">Conversão</p>
              </div>
              <p className="text-2xl font-bold text-white">62.3%</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-900 to-gray-950 border-gray-700 hover:border-gray-600 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-900/40 rounded-lg">
                  <FileText className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-sm text-gray-400">Relatórios</p>
              </div>
              <p className="text-2xl font-bold text-white">12</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-900 to-gray-950 border-gray-700 hover:border-gray-600 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-yellow-900/40 rounded-lg">
                  <Download className="w-5 h-5 text-yellow-400" />
                </div>
                <p className="text-sm text-gray-400">Downloads</p>
              </div>
              <p className="text-2xl font-bold text-white">28</p>
            </CardContent>
          </Card>
        </div>

        {/* Available Reports */}
        <Card className="bg-gray-950 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Relatórios Disponíveis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: "Relatório Mensal Completo", type: "PDF", size: "2.4 MB", date: "15/01/2025" },
                { name: "Análise de Conversões", type: "Excel", size: "1.2 MB", date: "14/01/2025" },
                { name: "Desempenho de Links", type: "PDF", size: "890 KB", date: "13/01/2025" },
                { name: "Relatório de Comissões", type: "PDF", size: "1.5 MB", date: "12/01/2025" },
                { name: "Análise de Rede", type: "Excel", size: "650 KB", date: "10/01/2025" }
              ].map((report, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-800 rounded-lg">
                      <FileText className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{report.name}</p>
                      <p className="text-gray-500 text-xs">
                        {report.type} • {report.size} • {report.date}
                      </p>
                    </div>
                  </div>
                  <Button 
                    size="sm"
                    className="bg-gray-800 text-gray-300 hover:bg-gray-700"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Baixar
                  </Button>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Generate New Report */}
        <Card className="bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 border-gray-700">
          <CardContent className="p-6">
            <div className="text-center">
              <FileText className="w-12 h-12 text-[#00E880] mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Gerar Novo Relatório</h3>
              <p className="text-gray-400 mb-4">
                Personalize e gere relatórios específicos para suas necessidades
              </p>
              <Button className="bg-gradient-to-r from-[#00E880] to-green-600 text-black hover:opacity-90">
                <FileText className="w-4 h-4 mr-2" />
                Criar Relatório Personalizado
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AffiliateLayout>
  );
}