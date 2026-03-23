export type CastType = 'tennen' | 'cool' | 'amae' | 'aneki';
export type CastStrength = 'listen' | 'hype' | 'heal' | 'thrill';
export type CustomerType = 'takyaku' | 'itakyaku' | 'shy' | 'jiman' | 'tester' | 'shinki';

export interface CastProfile {
  typeCode: string;       // 例: "EAST"
  typeName: string;       // 例: "百戦錬磨の先輩"
  scores: {
    character: number;    // -10〜+10
    service: number;
    emotion: number;
    sales: number;
  };
  completedAt: string;
}

export interface Customer {
  id: string;
  nickname: string;
  type: CustomerType;
  age?: string;
  job?: string;
  hobbies?: string;
  notes?: string;
  lastVisit?: string;
  createdAt: string;
}
