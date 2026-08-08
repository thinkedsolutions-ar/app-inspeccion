import React from 'react';

// Motor que detecta si una respuesta es una "Falta" para pintarla de rojo
const isFalta = (key: string, val: string) => {
  if(!val) return false;
  const v = String(val).toUpperCase();
  const rules123 = ['eval_horarios', 'eval_uniforme', 'eval_atencion', 'cond_ascenso_descenso', 'cond_marcha', 'cond_adelanto'];
  const rulesSI = ['cond_exceso_velocidad', 'normas_transito_frenadas', 'normas_transito_maniobras', 'normas_transito_linea'];
  const rulesNO = ['normas_transito_cinturon', 'normas_transito_semaforos', 'normas_transito_luces', 'normas_transito_paso'];

  if (rules123.includes(key) && ['1','2','3'].includes(v)) return true;
  if (rulesSI.includes(key) && v === 'SI') return true;
  if (rulesNO.includes(key) && v === 'NO') return true;
  return false;
};

// Tabla genérica para Limpieza, Normas, Evaluación, etc.
const ReadOnlyRatingTable = ({ title, items, options, prefix, data }: any) => (
  <div className="mb-4 overflow-hidden border border-[#003366] rounded shadow-sm">
    <table className="w-full text-sm text-center bg-white border-collapse">
      <thead className="bg-[#003366] text-white">
        <tr><th colSpan={options.length + 1} className="p-2 font-bold uppercase text-xs">{title}</th></tr>
        <tr className="bg-[#002244] text-[10px]">
          <th className="p-2 text-left w-1/2">ITEM</th>
          {options.map((o:string) => <th key={o} className="p-1">{o}</th>)}
        </tr>
      </thead>
      <tbody>
        {items.map((item:any, idx:number) => {
          const val = data[`${prefix}_${item.k}`];
          const isRed = isFalta(`${prefix}_${item.k}`, val);
          return (
            <tr key={item.k} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="p-2 text-left border-t border-r border-gray-200 text-xs font-medium">{item.l}</td>
              {options.map((opt:string) => (
                <td key={opt} className={`p-1 border-t border-gray-200 text-sm font-black ${val === opt ? (isRed ? 'text-red-600 bg-red-100' : 'text-[#003366] bg-blue-100') : 'text-gray-200'}`}>
                  {val === opt ? '☑' : '○'}
                </td>
              ))}
            </tr>
          )
        })}
      </tbody>
    </table>
    {data[`obs_${prefix}`] && (
      <div className="p-2 border-t border-[#003366] bg-yellow-50 text-left text-xs text-[#003366]">
        <strong>OBSERVACIONES: </strong> {data[`obs_${prefix}`]}
      </div>
    )}
  </div>
);

// Cuadro específico de Conducción
function ReadOnlyConduccion({ data }: any) {
   const items = [
      { k: 'ascenso_descenso', l: 'Ascenso / Descenso de pasajeros' }, 
      { k: 'exceso_velocidad', l: 'Excesos de velocidad' },
      { k: 'marcha', l: 'Inicio y fin de marcha (Cambios)' }, 
      { k: 'adelanto', l: 'Maniobra de adelanto' }
   ];
   return (
     <div className="mb-4 overflow-hidden border border-[#003366] rounded shadow-sm text-sm">
        <div className="bg-[#003366] text-white p-2 font-bold uppercase text-xs text-center">Conducción</div>
        <div className="bg-white p-3 space-y-3">
          {items.map(item => {
            const val = data[`cond_${item.k}`]; 
            const obs = data[`obs_cond_${item.k}`]; 
            const isRed = isFalta(`cond_${item.k}`, val);
            return (
              <div key={item.k} className="border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                 <div className="flex justify-between items-center mb-1">
                   <span className="font-bold text-[#003366] text-xs">{item.l}</span>
                   <span className={`font-black px-3 py-1 rounded text-xs border ${isRed ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-100 text-[#003366] border-gray-200'}`}>{val || '-'}</span>
                 </div>
                 {obs && <div className="text-[10px] text-[#003366] bg-yellow-50 p-1.5 rounded border border-yellow-200 mt-1"><strong>OBS:</strong> {obs}</div>}
              </div>
            )
          })}
        </div>
     </div>
   );
}

// Cuadro de Equipamiento y SUBE
const ReadOnlyEquipamiento = ({ data }: any) => {
  // Si la inspección es de Turismo, este módulo no existe.
  if (data.empresa === 'Turismo Buttini') return null;

  return (
    <div className="mb-4 overflow-hidden border border-[#003366] rounded shadow-sm text-xs text-center">
      <div className="bg-[#003366] text-white p-2 font-bold uppercase">Equipamiento y Sistemas</div>
      <div className="grid grid-cols-2 bg-gray-50 p-2 gap-2 text-left">
        <div className="font-bold self-center text-[#003366]">Micronauta</div><div className="bg-white p-1 border rounded font-bold">{data.micron_existe || '-'}</div>
        <div className="font-bold self-center text-[#003366]">Func. Equipo Micronauta</div><div className="bg-white p-1 border rounded font-bold">{data.micron_func || '-'}</div>
        <div className="font-bold self-center text-[#003366]">Cant. Pasajeros Micronauta</div><div className="bg-white p-1 border rounded font-bold">{data.micron_pasajeros || '-'}</div>
        <div className="col-span-2 border-t my-1 border-gray-200"></div>
        <div className="font-bold self-center text-[#003366]">SUBE</div><div className="bg-white p-1 border rounded font-bold">{data.sube_existe || '-'}</div>
        <div className="font-bold self-center text-[#003366]">Func. Equipo SUBE</div><div className="bg-white p-1 border rounded font-bold">{data.sube_func || '-'}</div>
        
        {data.sube_func === 'Incorrecto' && (
          <>
            <div className="font-bold self-center text-red-600">Tipo Falla SUBE</div>
            <div className="bg-red-50 p-1 border border-red-200 rounded font-bold text-red-600">{data.sube_tipo_falla || '-'}</div>
          </>
        )}
        
        <div className="font-bold self-center text-[#003366]">  {data.sube_func === 'Incorrecto' ? 'Pasajeros Transportados Sin SUBE' : 'Pasajeros Inspeccionados SUBE'}</div><div className="bg-white p-1 border rounded font-bold">{data.sube_pasajeros_sin_sube || '-'}</div>
      </div>
    </div>
  );
};

// Formulario Final (Ensamblador)
export default function FichaVisualizador({ ins }: any) {
  if (!ins) return null;
  const f = ins.datos_formulario || {}; 
  const t = ins.tipo || '';

  return (
    <div className="space-y-4">
      {/* Cabecera Básica */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <div className="bg-white p-2 rounded border shadow-sm"><label className="text-[9px] font-bold text-gray-500 uppercase block">Inspector</label><span className="text-xs font-black text-[#003366]">{ins.inspector}</span></div>
        <div className="bg-white p-2 rounded border shadow-sm"><label className="text-[9px] font-bold text-gray-500 uppercase block">Empresa</label><span className="text-xs font-black text-[#003366] truncate block">{f.empresa || 'Antonio Buttini'}</span></div>
        <div className="bg-white p-2 rounded border shadow-sm col-span-2"><label className="text-[9px] font-bold text-gray-500 uppercase block">Tipo</label><span className="text-xs font-black text-[#003366] truncate block">{t}</span></div>
        {f.conductor && <div className="bg-white p-2 rounded border shadow-sm col-span-2"><label className="text-[9px] font-bold text-gray-500 uppercase block">Conductor</label><span className="text-xs font-black text-[#003366] truncate block">{f.conductor}</span></div>}
        {f.unidad && <div className="bg-white p-2 rounded border shadow-sm"><label className="text-[9px] font-bold text-gray-500 uppercase block">Unidad</label><span className="text-xs font-black text-[#003366]">{f.unidad}</span></div>}
        {f.servicio && <div className="bg-white p-2 rounded border shadow-sm"><label className="text-[9px] font-bold text-gray-500 uppercase block">Servicio</label><span className="text-xs font-black text-[#003366]">{f.servicio}</span></div>}
      </div>

      {/* Renderizado de tablas según Tipo */}
      {(t.includes('INSPECTOR EN CALLE') || t.includes('Permanente')) && (
        <>
          <ReadOnlyRatingTable title="Limpieza de la Unidad" prefix="limp" options={['1','2','3','4','5','N/C']} items={[{k:'int', l:'Interior'}, {k:'ext', l:'Exterior'}, {k:'cab', l:'Cabezales'}, {k:'bano', l:'Baño'}, {k:'ac', l:'A/C - CALEF.'}]} data={f} />
          <ReadOnlyRatingTable title="Evaluación del Conductor" prefix="eval" options={['1','2','3','4','5','N/C']} items={[{k:'horarios', l:'Cumplimiento Horarios'}, {k:'uniforme', l:'Uniforme'}, {k:'atencion', l:'Atención al Usuario'}]} data={f} />
          <ReadOnlyConduccion data={f} />
          <ReadOnlyRatingTable title="Normas de Tránsito" prefix="normas_transito" options={['SI','NO']} items={[{k:'frenadas', l:'Frenadas Bruscas'}, {k:'cinturon', l:'Cinturón de Seguridad'}, {k:'semaforos', l:'Respeta Semáforos'}, {k:'maniobras', l:'Maniobras Agresivas'}, {k:'luces', l:'Uso de luces'}, {k:'bocina', l:'Uso de bocina'}, {k:'paso', l:'Cede el paso'}, {k:'linea', l:'Traspaso línea amarilla'}]} data={f} />
          
          {/* Muestra el Equipamiento SOLO si la empresa no es Turismo */}
          {f.empresa !== 'Turismo Buttini' && <ReadOnlyEquipamiento data={f} />}
        </>
      )}

      {(t.includes('Aspirante') || t.includes('Periodo de prueba')) && (
        <>
          <ReadOnlyRatingTable title="Presentación Personal" prefix="pres" options={['NC','CR','CS','NP']} items={[{k:'puntualidad', l:'Puntualidad'}, {k:'uniforme', l:'Uniforme'}, {k:'aseo', l:'Aseo'}, {k:'barba', l:'No usa barba'}, {k:'tatuajes', l:'No tatuajes'}]} data={f} />
          <ReadOnlyRatingTable title="Trato al Usuario" prefix="trato" options={['NC','CR','CS','NP']} items={[{k:'modo', l:'Modo'}, {k:'conflicto', l:'Reacción conflicto'}, {k:'incidente', l:'Reacción incidente'}, {k:'info', l:'Información'}]} data={f} />
          <ReadOnlyRatingTable title="Tiempo de Reacción" prefix="reac" options={['NC','CR','CS','NP']} items={[{k:'dist_seg', l:'Distancia seguimiento'}, {k:'dist_fren', l:'Distancia frenado'}, {k:'vel', l:'Velocidad'}, {k:'precaucion', l:'Precaución'}, {k:'vis_otros', l:'Vis. otros vehículos'}]} data={f} />
          <ReadOnlyRatingTable title="Señales de Transito" prefix="senales" options={['NC','CR','CS','NP']} items={[{k:'vel_minmax', l:'Velocidad min/max'}, {k:'carriles', l:'Carriles exclusivos'}, {k:'doble_linea', l:'Doble línea amarilla'}, {k:'semaforos', l:'Semáforos'}, {k:'contrario', l:'Sentido contrario'}, {k:'ceda', l:'Ceda el paso'}, {k:'cruce_nivel', l:'Cruce paso a nivel'}, {k:'prohibido', l:'Prohibido girar'}]} data={f} />
          <ReadOnlyRatingTable title="Conducción" prefix="cond" options={['NC','CR','CS','NP']} items={[{k:'espejos', l:'Uso espejos'}, {k:'senal', l:'Señalización'}, {k:'vel', l:'Velocidad'}, {k:'dist', l:'Distancia'}, {k:'maniobras', l:'Maniobras'}, {k:'entorno', l:'Vis. entorno'}, {k:'defensivo', l:'Manejo defensivo'}, {k:'guias', l:'Uso de guías'}, {k:'instructivos', l:'Cumpl. instructivos'}]} data={f} />
        </>
      )}

      {t.includes('EMOP') && <div className="bg-white p-4 border rounded shadow-sm text-sm whitespace-pre-wrap"><strong className="text-[#003366] block mb-2">Detalles EMOP:</strong>{f.emop_detalle || '-'}</div>}
      {t.includes('TEMAS') && <div className="bg-white p-4 border rounded shadow-sm text-sm whitespace-pre-wrap"><strong className="text-[#003366] block mb-2">Tema: {f.tema_tipo || '-'}</strong>{f.observacion_temas || '-'}</div>}
      {t.includes('DESCANSO') && <div className="bg-white p-3 border rounded shadow-sm mb-2"><strong className="text-[#003366] text-xs">Ubicación: {f.ubicacion || '-'}</strong></div>}

      {/* Observaciones Generales */}
      {ins.obs_general && (
        <div className="bg-yellow-50 p-4 border border-yellow-200 rounded shadow-sm text-sm whitespace-pre-wrap mt-6">
          <strong className="text-yellow-800 block mb-1">Observaciones Generales:</strong>
          {ins.obs_general}
        </div>
      )}
    </div>
  );
}