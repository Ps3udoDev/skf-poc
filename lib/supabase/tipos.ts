export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      clientes: {
        Row: {
          descuento: number
          id: number
          nombre: string
          tipo: Database["public"]["Enums"]["tipo_cliente"]
          usa_wcl: boolean
        }
        Insert: {
          descuento?: number
          id?: number
          nombre: string
          tipo: Database["public"]["Enums"]["tipo_cliente"]
          usa_wcl?: boolean
        }
        Update: {
          descuento?: number
          id?: number
          nombre?: string
          tipo?: Database["public"]["Enums"]["tipo_cliente"]
          usa_wcl?: boolean
        }
        Relationships: []
      }
      cotizaciones: {
        Row: {
          cantidad: number
          cliente_id: number
          designacion: string
          fecha_respuesta: string | null
          fecha_solicitud: string
          motivo_declinado:
            | Database["public"]["Enums"]["motivo_declinado"]
            | null
          numero: string
          operador_id: number | null
          patron: string | null
          precio: number | null
          resultado: Database["public"]["Enums"]["resultado_cotizacion"]
          te_semanas: number | null
        }
        Insert: {
          cantidad: number
          cliente_id: number
          designacion: string
          fecha_respuesta?: string | null
          fecha_solicitud: string
          motivo_declinado?:
            | Database["public"]["Enums"]["motivo_declinado"]
            | null
          numero: string
          operador_id?: number | null
          patron?: string | null
          precio?: number | null
          resultado: Database["public"]["Enums"]["resultado_cotizacion"]
          te_semanas?: number | null
        }
        Update: {
          cantidad?: number
          cliente_id?: number
          designacion?: string
          fecha_respuesta?: string | null
          fecha_solicitud?: string
          motivo_declinado?:
            | Database["public"]["Enums"]["motivo_declinado"]
            | null
          numero?: string
          operador_id?: number | null
          patron?: string | null
          precio?: number | null
          resultado?: Database["public"]["Enums"]["resultado_cotizacion"]
          te_semanas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cotizaciones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_operador_id_fkey"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "operadores"
            referencedColumns: ["id"]
          },
        ]
      }
      designaciones: {
        Row: {
          creada_en: string
          descripcion: string
          designacion: string
          es_nueva_creacion: boolean
          familia: string
          fpc: Database["public"]["Enums"]["fpc_codigo"]
          lcc: Database["public"]["Enums"]["lcc_codigo"]
          moq: number
          pack_quantity: number
          pcc: Database["public"]["Enums"]["pcc_codigo"]
          pdiv: string
          precio_lista: number | null
          reemplazado_por: string | null
          reemplazo_indicado_fabrica: string | null
          segmento: Database["public"]["Enums"]["segmento_producto"]
          vigente: boolean
        }
        Insert: {
          creada_en?: string
          descripcion: string
          designacion: string
          es_nueva_creacion?: boolean
          familia: string
          fpc: Database["public"]["Enums"]["fpc_codigo"]
          lcc: Database["public"]["Enums"]["lcc_codigo"]
          moq?: number
          pack_quantity?: number
          pcc: Database["public"]["Enums"]["pcc_codigo"]
          pdiv: string
          precio_lista?: number | null
          reemplazado_por?: string | null
          reemplazo_indicado_fabrica?: string | null
          segmento?: Database["public"]["Enums"]["segmento_producto"]
          vigente?: boolean
        }
        Update: {
          creada_en?: string
          descripcion?: string
          designacion?: string
          es_nueva_creacion?: boolean
          familia?: string
          fpc?: Database["public"]["Enums"]["fpc_codigo"]
          lcc?: Database["public"]["Enums"]["lcc_codigo"]
          moq?: number
          pack_quantity?: number
          pcc?: Database["public"]["Enums"]["pcc_codigo"]
          pdiv?: string
          precio_lista?: number | null
          reemplazado_por?: string | null
          reemplazo_indicado_fabrica?: string | null
          segmento?: Database["public"]["Enums"]["segmento_producto"]
          vigente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "designaciones_pdiv_fkey"
            columns: ["pdiv"]
            isOneToOne: false
            referencedRelation: "plantas"
            referencedColumns: ["pdiv"]
          },
          {
            foreignKeyName: "designaciones_reemplazado_por_fkey"
            columns: ["reemplazado_por"]
            isOneToOne: false
            referencedRelation: "designaciones"
            referencedColumns: ["designacion"]
          },
        ]
      }
      eventos_demo: {
        Row: {
          designacion: string | null
          detalle: Json
          id: number
          ocurrido_en: string
          pdiv: string | null
          perfil: string | null
          tipo: Database["public"]["Enums"]["tipo_evento"]
        }
        Insert: {
          designacion?: string | null
          detalle?: Json
          id?: number
          ocurrido_en?: string
          pdiv?: string | null
          perfil?: string | null
          tipo: Database["public"]["Enums"]["tipo_evento"]
        }
        Update: {
          designacion?: string | null
          detalle?: Json
          id?: number
          ocurrido_en?: string
          pdiv?: string | null
          perfil?: string | null
          tipo?: Database["public"]["Enums"]["tipo_evento"]
        }
        Relationships: []
      }
      homologos: {
        Row: {
          diferencias: Json
          equivalente: string
          id: number
          motivo: string
          origen: string
        }
        Insert: {
          diferencias?: Json
          equivalente: string
          id?: number
          motivo: string
          origen: string
        }
        Update: {
          diferencias?: Json
          equivalente?: string
          id?: number
          motivo?: string
          origen?: string
        }
        Relationships: [
          {
            foreignKeyName: "homologos_equivalente_fkey"
            columns: ["equivalente"]
            isOneToOne: false
            referencedRelation: "designaciones"
            referencedColumns: ["designacion"]
          },
          {
            foreignKeyName: "homologos_origen_fkey"
            columns: ["origen"]
            isOneToOne: false
            referencedRelation: "designaciones"
            referencedColumns: ["designacion"]
          },
        ]
      }
      intenciones_pedido: {
        Row: {
          cantidad: number
          cliente_id: number | null
          designacion: string
          encolada_en: string
          estado: Database["public"]["Enums"]["estado_intencion"]
          id: number
          nota: string | null
          pdiv: string
          resuelta_en: string | null
        }
        Insert: {
          cantidad: number
          cliente_id?: number | null
          designacion: string
          encolada_en?: string
          estado?: Database["public"]["Enums"]["estado_intencion"]
          id?: number
          nota?: string | null
          pdiv: string
          resuelta_en?: string | null
        }
        Update: {
          cantidad?: number
          cliente_id?: number | null
          designacion?: string
          encolada_en?: string
          estado?: Database["public"]["Enums"]["estado_intencion"]
          id?: number
          nota?: string | null
          pdiv?: string
          resuelta_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intenciones_pedido_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intenciones_pedido_designacion_fkey"
            columns: ["designacion"]
            isOneToOne: false
            referencedRelation: "designaciones"
            referencedColumns: ["designacion"]
          },
          {
            foreignKeyName: "intenciones_pedido_pdiv_fkey"
            columns: ["pdiv"]
            isOneToOne: false
            referencedRelation: "plantas"
            referencedColumns: ["pdiv"]
          },
        ]
      }
      inventario: {
        Row: {
          almacen: Database["public"]["Enums"]["almacen_codigo"]
          cantidad: number
          designacion: string
          pdiv_dueno: string
        }
        Insert: {
          almacen: Database["public"]["Enums"]["almacen_codigo"]
          cantidad?: number
          designacion: string
          pdiv_dueno: string
        }
        Update: {
          almacen?: Database["public"]["Enums"]["almacen_codigo"]
          cantidad?: number
          designacion?: string
          pdiv_dueno?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventario_designacion_fkey"
            columns: ["designacion"]
            isOneToOne: false
            referencedRelation: "designaciones"
            referencedColumns: ["designacion"]
          },
          {
            foreignKeyName: "inventario_pdiv_dueno_fkey"
            columns: ["pdiv_dueno"]
            isOneToOne: false
            referencedRelation: "plantas"
            referencedColumns: ["pdiv"]
          },
        ]
      }
      operadores: {
        Row: {
          activo: boolean
          codigo: string
          id: number
        }
        Insert: {
          activo?: boolean
          codigo: string
          id?: number
        }
        Update: {
          activo?: boolean
          codigo?: string
          id?: number
        }
        Relationships: []
      }
      plantas: {
        Row: {
          com: string
          desempeno_te: number
          huso: string
          nombre: string
          pais: string
          pdiv: string
          tiene_conexion: boolean
          tiene_ruta_embarque: boolean
          ventana_duracion_min: number
          ventana_inicio_min: number
          ventana_variabilidad_min: number
        }
        Insert: {
          com: string
          desempeno_te?: number
          huso: string
          nombre: string
          pais: string
          pdiv: string
          tiene_conexion?: boolean
          tiene_ruta_embarque?: boolean
          ventana_duracion_min: number
          ventana_inicio_min: number
          ventana_variabilidad_min?: number
        }
        Update: {
          com?: string
          desempeno_te?: number
          huso?: string
          nombre?: string
          pais?: string
          pdiv?: string
          tiene_conexion?: boolean
          tiene_ruta_embarque?: boolean
          ventana_duracion_min?: number
          ventana_inicio_min?: number
          ventana_variabilidad_min?: number
        }
        Relationships: []
      }
      sesion_demo: {
        Row: {
          actualizado_en: string
          escenario_activo: string | null
          id: number
          iniciada_en: string
          modo: Database["public"]["Enums"]["modo_demo"]
          plantas_override: Json
          reloj_offset_min: number
        }
        Insert: {
          actualizado_en?: string
          escenario_activo?: string | null
          id?: number
          iniciada_en?: string
          modo?: Database["public"]["Enums"]["modo_demo"]
          plantas_override?: Json
          reloj_offset_min?: number
        }
        Update: {
          actualizado_en?: string
          escenario_activo?: string | null
          id?: number
          iniciada_en?: string
          modo?: Database["public"]["Enums"]["modo_demo"]
          plantas_override?: Json
          reloj_offset_min?: number
        }
        Relationships: []
      }
      snapshot_inventario: {
        Row: {
          almacen: Database["public"]["Enums"]["almacen_codigo"]
          cantidad: number
          designacion: string
          hora_corte: string
          id: number
          pdiv: string
        }
        Insert: {
          almacen: Database["public"]["Enums"]["almacen_codigo"]
          cantidad: number
          designacion: string
          hora_corte: string
          id?: number
          pdiv: string
        }
        Update: {
          almacen?: Database["public"]["Enums"]["almacen_codigo"]
          cantidad?: number
          designacion?: string
          hora_corte?: string
          id?: number
          pdiv?: string
        }
        Relationships: [
          {
            foreignKeyName: "snapshot_inventario_designacion_fkey"
            columns: ["designacion"]
            isOneToOne: false
            referencedRelation: "designaciones"
            referencedColumns: ["designacion"]
          },
          {
            foreignKeyName: "snapshot_inventario_pdiv_fkey"
            columns: ["pdiv"]
            isOneToOne: false
            referencedRelation: "plantas"
            referencedColumns: ["pdiv"]
          },
        ]
      }
      solicitudes: {
        Row: {
          atendida_en: string | null
          cantidad: number
          clasificacion_qms: string | null
          cliente_id: number | null
          creada_en: string
          csr_asignado: number | null
          designacion_texto: string
          id: number
          motivo_declinado:
            | Database["public"]["Enums"]["motivo_declinado"]
            | null
          numero: string
          punto_qms: string | null
          resultado: Database["public"]["Enums"]["resultado_cotizacion"] | null
        }
        Insert: {
          atendida_en?: string | null
          cantidad: number
          clasificacion_qms?: string | null
          cliente_id?: number | null
          creada_en?: string
          csr_asignado?: number | null
          designacion_texto: string
          id?: number
          motivo_declinado?:
            | Database["public"]["Enums"]["motivo_declinado"]
            | null
          numero: string
          punto_qms?: string | null
          resultado?: Database["public"]["Enums"]["resultado_cotizacion"] | null
        }
        Update: {
          atendida_en?: string | null
          cantidad?: number
          clasificacion_qms?: string | null
          cliente_id?: number | null
          creada_en?: string
          csr_asignado?: number | null
          designacion_texto?: string
          id?: number
          motivo_declinado?:
            | Database["public"]["Enums"]["motivo_declinado"]
            | null
          numero?: string
          punto_qms?: string | null
          resultado?: Database["public"]["Enums"]["resultado_cotizacion"] | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_csr_asignado_fkey"
            columns: ["csr_asignado"]
            isOneToOne: false
            referencedRelation: "operadores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      almacen_codigo: "PS" | "SL" | "XX"
      estado_intencion: "encolada" | "confirmada" | "ajustada" | "escalada"
      fpc_codigo: "1" | "2"
      lcc_codigo: "PLAN" | "NP"
      modo_demo: "hoy" | "solucion"
      motivo_declinado:
        | "ya_disponible_wcl"
        | "moq_mayor"
        | "obsoleto_sin_reemplazo"
        | "designacion_invalida"
        | "planta_sin_ruta"
      pcc_codigo: "C" | "P" | "N" | "O"
      resultado_cotizacion: "cotizada" | "declinada"
      segmento_producto: "rodamiento" | "power_transmission"
      tipo_cliente: "AFT" | "OEM" | "USUARIO_FINAL"
      tipo_evento:
        | "busqueda"
        | "sugerencia_aceptada"
        | "solicitud_evitada"
        | "solicitud_generada"
        | "confirmacion_homologo"
        | "aviso_moq"
        | "aviso_pack_quantity"
        | "ventana_inicio"
        | "ventana_fin"
        | "intencion_encolada"
        | "reconciliacion"
        | "llamada_modelo"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      almacen_codigo: ["PS", "SL", "XX"],
      estado_intencion: ["encolada", "confirmada", "ajustada", "escalada"],
      fpc_codigo: ["1", "2"],
      lcc_codigo: ["PLAN", "NP"],
      modo_demo: ["hoy", "solucion"],
      motivo_declinado: [
        "ya_disponible_wcl",
        "moq_mayor",
        "obsoleto_sin_reemplazo",
        "designacion_invalida",
        "planta_sin_ruta",
      ],
      pcc_codigo: ["C", "P", "N", "O"],
      resultado_cotizacion: ["cotizada", "declinada"],
      segmento_producto: ["rodamiento", "power_transmission"],
      tipo_cliente: ["AFT", "OEM", "USUARIO_FINAL"],
      tipo_evento: [
        "busqueda",
        "sugerencia_aceptada",
        "solicitud_evitada",
        "solicitud_generada",
        "confirmacion_homologo",
        "aviso_moq",
        "aviso_pack_quantity",
        "ventana_inicio",
        "ventana_fin",
        "intencion_encolada",
        "reconciliacion",
        "llamada_modelo",
      ],
    },
  },
} as const
