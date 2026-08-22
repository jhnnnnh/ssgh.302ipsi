export type UserRole = "student" | "teacher";

export type SupportLevel = "상향" | "소신" | "적정" | "하향";

/** 전형 유형: 자유 텍스트 (빠른 선택 버튼 + "직접입력"으로 임의 문자열 허용) */
export type ApplicationCategory = string;

export type ApplicationStatus =
  | "지원예정"
  | "원서접수"
  | "1차합격"
  | "최종합격"
  | "예비번호"
  | "불합격";

export type SelectionMode = "single" | "multi";

export type FavoriteCategory = "weekday" | "weekend";

export type Roster = {
  student_id: string;
  name: string;
  created_at: string;
};

export type Profile = {
  id: string;
  role: UserRole;
  student_id: string | null;
  name: string | null;
  theme_color: string | null;
  font_family: string | null;
  font_scale: string | null;
  created_at: string;
};

export type CounselingSlot = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
  student_id: string | null;
  student_name: string | null;
  booked_at: string | null;
  memo: string | null;
  created_at: string;
};

export type SlotFavorite = {
  id: string;
  category: FavoriteCategory;
  start_time: string;
  end_time: string;
  created_at: string;
};

export type WonseoCard = {
  id: string;
  student_id: string;
  rank: string | null;
  level: SupportLevel;
  status: ApplicationStatus;
  university: string | null;
  department: string | null;
  category: ApplicationCategory;
  sub_category: string | null;
  selection_mode: SelectionMode;
  stage_single: string | null;
  stage_1: string | null;
  stage_2: string | null;
  calculated_grade: string | null;
  min_standard: string | null;
  has_exam_date: boolean;
  exam_date: string | null;
  memo: string | null;
  recent_results: RecentResultYear[];
  sort_order: number;
  created_at: string;
  updated_at: string;
};

/** 최근 입결 표의 한 연도 열. 모든 값은 대학마다 표기 형식이 달라 자유 텍스트로 둔다. */
export type RecentResultYear = {
  year: string;
  enrollment: string;
  competitionRate: string;
  fillCount: string;
  cut50: string;
  cut70: string;
  myPosition: string;
};

export type WonseoImage = {
  id: string;
  card_id: string;
  student_id: string;
  storage_path: string;
  created_at: string;
};

export type AppSettings = {
  key: string;
  value: Record<string, unknown>;
};

type NoRelationships = { Relationships: [] };

export type Database = {
  public: {
    Tables: {
      roster: {
        Row: Roster;
        Insert: Pick<Roster, "student_id" | "name"> & Partial<Pick<Roster, "created_at">>;
        Update: Partial<Roster>;
      } & NoRelationships;
      profiles: {
        Row: Profile;
        Insert: Pick<Profile, "id" | "role"> &
          Partial<
            Pick<
              Profile,
              "student_id" | "name" | "theme_color" | "font_family" | "font_scale" | "created_at"
            >
          >;
        Update: Partial<Profile>;
      } & NoRelationships;
      counseling_slots: {
        Row: CounselingSlot;
        Insert: Pick<CounselingSlot, "date" | "start_time" | "end_time"> &
          Partial<
            Pick<
              CounselingSlot,
              | "id"
              | "is_booked"
              | "student_id"
              | "student_name"
              | "booked_at"
              | "memo"
              | "created_at"
            >
          >;
        Update: Partial<CounselingSlot>;
      } & NoRelationships;
      slot_favorites: {
        Row: SlotFavorite;
        Insert: Pick<SlotFavorite, "category" | "start_time" | "end_time"> &
          Partial<Pick<SlotFavorite, "id" | "created_at">>;
        Update: Partial<SlotFavorite>;
      } & NoRelationships;
      wonseo_cards: {
        Row: WonseoCard;
        Insert: Pick<WonseoCard, "student_id" | "university"> &
          Partial<Omit<WonseoCard, "student_id" | "university" | "id">> & { id?: string };
        Update: Partial<WonseoCard>;
      } & NoRelationships;
      wonseo_images: {
        Row: WonseoImage;
        Insert: Pick<WonseoImage, "card_id" | "student_id" | "storage_path"> &
          Partial<Pick<WonseoImage, "id" | "created_at">>;
        Update: Partial<WonseoImage>;
      } & NoRelationships;
      app_settings: {
        Row: AppSettings;
        Insert: AppSettings;
        Update: Partial<AppSettings>;
      } & NoRelationships;
    };
    Views: Record<string, never>;
    Functions: {
      book_slot: {
        Args: { p_slot_id: string };
        Returns: CounselingSlot;
      };
      cancel_slot: {
        Args: { p_slot_id: string };
        Returns: CounselingSlot;
      };
    };
  };
};
