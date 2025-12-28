import { NextResponse } from "next/server";
import { requireSession } from "@/lib/server/session";
import { queryAutolavado } from "@/lib/db-autolavado";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ oldName: string }> }
) {
  try {
    await requireSession();
    const { oldName } = await params;
    const body = await req.json();
    const { newName } = body;

    if (!newName || !newName.trim()) {
      return NextResponse.json({ error: "New name is required" }, { status: 400 });
    }

    const decodedOldName = decodeURIComponent(oldName);
    const sanitizedNew = newName.trim().replace(/'/g, "''");

    // Verificar si el nuevo valor ya existe
    const checkQuery = `
      SELECT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = $1 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'vehicle_size')
      ) as exists
    `;

    const { rows: checkRows } = await queryAutolavado(checkQuery, [newName.trim()]);

    if (checkRows[0].exists) {
      return NextResponse.json({ error: "El tipo de vehículo ya existe" }, { status: 400 });
    }

    // Proceso de renombrado:
    // 1. Crear nuevo ENUM temporal con el valor nuevo
    const createTempEnumQuery = `
      CREATE TYPE vehicle_size_temp AS ENUM (
        SELECT enumlabel::text 
        FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'vehicle_size')
      )
    `;
    
    // Primero, obtener todos los valores actuales del enum
    const getEnumValuesQuery = `
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'vehicle_size')
      ORDER BY enumsortorder
    `;
    
    const { rows: enumRows } = await queryAutolavado(getEnumValuesQuery, []);
    const enumValues = enumRows.map(r => r.enumlabel);
    
    // Reemplazar el valor viejo con el nuevo
    const updatedValues = enumValues.map(val => val === decodedOldName ? newName.trim() : val);
    const enumList = updatedValues.map(v => `'${v.replace(/'/g, "''")}'`).join(', ');
    
    // Limpiar tipo temporal si existe de una ejecución anterior fallida
    await queryAutolavado('DROP TYPE IF EXISTS vehicle_size_new', []);
    
    // Crear nuevo tipo con los valores actualizados
    await queryAutolavado(`CREATE TYPE vehicle_size_new AS ENUM (${enumList})`, []);

    // Crear la expresión CASE para mapear el valor viejo al nuevo
    const sanitizedOldName = decodedOldName.replace(/'/g, "''");
    const caseExpression = `
      CASE 
        WHEN size::text = '${sanitizedOldName}' THEN '${sanitizedNew}'
        ELSE size::text
      END::vehicle_size_new
    `;

    // 2. Actualizar service_vehicle_modifiers
    const updateModifiersQuery = `
      ALTER TABLE service_vehicle_modifiers 
      ALTER COLUMN size TYPE vehicle_size_new 
      USING ${caseExpression}
    `;
    await queryAutolavado(updateModifiersQuery, []);

    // 3. Actualizar booking_items si existe
    const caseExpressionBooking = `
      CASE 
        WHEN vehicle_size::text = '${sanitizedOldName}' THEN '${sanitizedNew}'
        ELSE vehicle_size::text
      END::vehicle_size_new
    `;
    
    const updateBookingsQuery = `
      ALTER TABLE booking_items 
      ALTER COLUMN vehicle_size TYPE vehicle_size_new 
      USING ${caseExpressionBooking}
    `;
    await queryAutolavado(updateBookingsQuery, []);

    // 4. Eliminar el tipo viejo y renombrar el nuevo
    await queryAutolavado('DROP TYPE vehicle_size', []);
    await queryAutolavado('ALTER TYPE vehicle_size_new RENAME TO vehicle_size', []);

    return NextResponse.json({ 
      ok: true, 
      message: "Tipo de vehículo actualizado correctamente",
      oldName: decodedOldName,
      newName: newName.trim()
    });
  } catch (error: any) {
    console.error("[Autolavado API] Update vehicle type error:", error);
    return NextResponse.json({ 
      error: error.message || "Internal server error" 
    }, { status: 500 });
  }
}
