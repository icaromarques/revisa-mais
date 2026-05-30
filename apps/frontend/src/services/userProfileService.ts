import { doc, getDoc, updateDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/lib/toast';

export type GoalCategory = 'horas_estudo' | 'revisoes' | 'questoes' | 'constancia' | 'materia' | 'personalizada';
export type TrackingMode = 'automatic' | 'manual';
export type PeriodType = 'semanal' | 'quinzenal' | 'mensal' | 'personalizado';

export interface StudyGoal {
  id: string;
  title: string;
  category: GoalCategory;
  tracking_mode: TrackingMode;
  target_value?: number;
  target_unit?: string;
  current_value?: number;
  period_type: PeriodType;
  start_date?: string;
  due_date?: string;
  status: 'active' | 'completed' | 'abandoned';
  notes?: string;
  materia_id?: string;
}

export interface UserProfileSchema {
  nome: string;
  bio?: string;
  instituicao?: string;
  curso?: string;
  semestre?: string;
  turno?: string;
  foto_url?: string;
  rotina?: string;
  goals?: StudyGoal[];
  created_at?: string;
  updated_at?: string;
  plano?: string;
}

export const userProfileService = {
  subscribe(userId: string, callback: (data: UserProfileSchema | null) => void) {
    return onSnapshot(doc(db, 'users', userId), (snap) => {
      if (snap.exists()) {
        callback(snap.data() as UserProfileSchema);
      } else {
        callback(null);
      }
    });
  },

  async updateProfile(userId: string, data: Partial<UserProfileSchema>) {
    try {
      const docRef = doc(db, 'users', userId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        await updateDoc(docRef, { ...data, updated_at: new Date().toISOString() });
      } else {
        await setDoc(docRef, { ...data, updated_at: new Date().toISOString() }, { merge: true });
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  async addGoal(userId: string, goal: Omit<StudyGoal, 'id' | 'status'>) {
    const docRef = doc(db, 'users', userId);
    const snap = await getDoc(docRef);
    const goals = (snap.data()?.goals as StudyGoal[]) || [];
    const newGoals = [...goals, { ...goal, id: crypto.randomUUID(), status: 'active' as const }];
    await this.updateProfile(userId, { goals: newGoals });
  },

  async updateGoal(userId: string, goalId: string, updates: Partial<StudyGoal>) {
    const docRef = doc(db, 'users', userId);
    const snap = await getDoc(docRef);
    const goals = (snap.data()?.goals as StudyGoal[]) || [];
    const newGoals = goals.map(g => g.id === goalId ? { ...g, ...updates } : g);
    await this.updateProfile(userId, { goals: newGoals });
  },

  async deleteGoal(userId: string, goalId: string) {
    const docRef = doc(db, 'users', userId);
    const snap = await getDoc(docRef);
    const goals = (snap.data()?.goals as StudyGoal[]) || [];
    const newGoals = goals.filter(g => g.id !== goalId);
    await this.updateProfile(userId, { goals: newGoals });
  }
};
