/*
  Warnings:

  - You are about to drop the column `map_user_id` on the `notificacoes` table. All the data in the column will be lost.
  - Added the required column `user_id` to the `aulas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `materiais_estudo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `notificacoes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `notificacoes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `ocorrencias_grade` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "notificacoes" DROP CONSTRAINT "notificacoes_map_user_id_fkey";

-- AlterTable
ALTER TABLE "aulas" ADD COLUMN     "metadata_json" JSONB,
ADD COLUMN     "observacoes" TEXT,
ADD COLUMN     "professor" TEXT,
ADD COLUMN     "reposicao_ocorrencia_id" TEXT,
ADD COLUMN     "topico_id" TEXT,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "bloqueios_agenda" ADD COLUMN     "cor" TEXT,
ADD COLUMN     "data_especifica" TIMESTAMP(3),
ADD COLUMN     "data_fim_vigencia" TIMESTAMP(3),
ADD COLUMN     "data_inicio_vigencia" TIMESTAMP(3),
ADD COLUMN     "observacoes" TEXT,
ADD COLUMN     "tipo" TEXT NOT NULL DEFAULT 'bloqueio';

-- AlterTable
ALTER TABLE "decks" ADD COLUMN     "aula_id" TEXT,
ADD COLUMN     "descricao" TEXT,
ADD COLUMN     "materia_id" TEXT,
ADD COLUMN     "topico_id" TEXT;

-- AlterTable
ALTER TABLE "eventos_academicos" ADD COLUMN     "aula_id" TEXT;

-- AlterTable
ALTER TABLE "grade_faculdade" ADD COLUMN     "cor" TEXT,
ADD COLUMN     "data_especifica" TIMESTAMP(3),
ADD COLUMN     "data_fim_vigencia" TIMESTAMP(3),
ADD COLUMN     "data_inicio_vigencia" TIMESTAMP(3),
ADD COLUMN     "limite_faltas_percentual" DOUBLE PRECISION,
ADD COLUMN     "local" TEXT,
ADD COLUMN     "materia_id" TEXT,
ADD COLUMN     "numero_periodo" INTEGER,
ADD COLUMN     "observacoes" TEXT,
ADD COLUMN     "periodo_fim" TIMESTAMP(3),
ADD COLUMN     "periodo_inicio" TIMESTAMP(3),
ADD COLUMN     "professor" TEXT,
ADD COLUMN     "recorrente" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "tipo_periodo" TEXT;

-- AlterTable
ALTER TABLE "materiais_estudo" ADD COLUMN     "conteudo" TEXT,
ADD COLUMN     "metadata_json" JSONB,
ADD COLUMN     "topico_id" TEXT,
ADD COLUMN     "user_id" TEXT NOT NULL,
ALTER COLUMN "url" DROP NOT NULL;

-- AlterTable
ALTER TABLE "materias" ADD COLUMN     "descricao" TEXT,
ADD COLUMN     "exibir_no_calendario" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "ia_habilitada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "limite_faltas_percentual" DOUBLE PRECISION,
ADD COLUMN     "meta_semanal_horas" DOUBLE PRECISION,
ADD COLUMN     "numero_periodo" INTEGER,
ADD COLUMN     "periodo_fim" TIMESTAMP(3),
ADD COLUMN     "periodo_inicio" TIMESTAMP(3),
ADD COLUMN     "peso_importancia" TEXT,
ADD COLUMN     "prioridade" TEXT,
ADD COLUMN     "professor" TEXT,
ADD COLUMN     "revisao_automatica_ativa" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'em_andamento',
ADD COLUMN     "tipo_periodo" TEXT;

-- AlterTable
ALTER TABLE "notificacoes" DROP COLUMN "map_user_id",
ADD COLUMN     "metadata_json" JSONB,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ocorrencias_grade" ADD COLUMN     "aula_id" TEXT,
ADD COLUMN     "grade_id" TEXT,
ADD COLUMN     "observacoes" TEXT,
ADD COLUMN     "origem" TEXT,
ADD COLUMN     "quantidade_ocorrencias" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "reposicao_aula_id" TEXT,
ADD COLUMN     "reposicao_observacao" TEXT,
ADD COLUMN     "reposicao_sessao_id" TEXT,
ADD COLUMN     "status_reposicao" TEXT DEFAULT 'pendente',
ADD COLUMN     "tipo_falta" TEXT,
ADD COLUMN     "topico_id" TEXT,
ADD COLUMN     "user_id" TEXT NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'pendente_confirmacao';

-- AlterTable
ALTER TABLE "revisoes" ADD COLUMN     "aula_id" TEXT;

-- AlterTable
ALTER TABLE "sessoes_estudo" ADD COLUMN     "acertos" INTEGER,
ADD COLUMN     "dificuldade" INTEGER,
ADD COLUMN     "notas" TEXT,
ADD COLUMN     "origem_sessao" TEXT,
ADD COLUMN     "professor" TEXT,
ADD COLUMN     "titulo" TEXT,
ADD COLUMN     "total_questoes" INTEGER;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "gcal_channel_expires_at" TIMESTAMP(3),
ADD COLUMN     "gcal_channel_id" TEXT,
ADD COLUMN     "gcal_sync_token" TEXT;

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "bio" TEXT,
    "instituicao" TEXT,
    "curso" TEXT,
    "semestre" TEXT,
    "turno" TEXT,
    "foto_url" TEXT,
    "rotina" TEXT,
    "plano" TEXT DEFAULT 'free',
    "goals_json" JSONB NOT NULL DEFAULT '[]',
    "settings_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessoes_estudo" ADD CONSTRAINT "sessoes_estudo_materia_id_fkey" FOREIGN KEY ("materia_id") REFERENCES "materias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aulas" ADD CONSTRAINT "aulas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aulas" ADD CONSTRAINT "aulas_topico_id_fkey" FOREIGN KEY ("topico_id") REFERENCES "topicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materiais_estudo" ADD CONSTRAINT "materiais_estudo_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_faculdade" ADD CONSTRAINT "grade_faculdade_materia_id_fkey" FOREIGN KEY ("materia_id") REFERENCES "materias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocorrencias_grade" ADD CONSTRAINT "ocorrencias_grade_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
