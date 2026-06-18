import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Badge } from '../components/Badge';
import type { Campaign, Client, Paginated, Template } from '../types';

export function Dashboard() {
  const [clientsTotal, setClientsTotal] = useState(0);
  const [activeTotal, setActiveTotal] = useState(0);
  const [templatesTotal, setTemplatesTotal] = useState(0);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api<Paginated<Client>>('/clients?limit=1'),
      api<Paginated<Client>>('/clients?limit=1&activo=true'),
      api<Template[]>('/templates'),
      api<Paginated<Campaign>>('/campaigns?limit=5'),
    ])
      .then(([all, active, templates, camps]) => {
        setClientsTotal(all.total);
        setActiveTotal(active.total);
        setTemplatesTotal(templates.length);
        setCampaigns(camps.items);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p>Resumen general de tu operación de mensajería.</p>
        </div>
      </div>

      <div className="cards">
        <div className="stat-card">
          <div className="label">Clientes totales</div>
          <div className="value">{loading ? '—' : clientsTotal}</div>
        </div>
        <div className="stat-card">
          <div className="label">Clientes activos</div>
          <div className="value">{loading ? '—' : activeTotal}</div>
        </div>
        <div className="stat-card">
          <div className="label">Plantillas</div>
          <div className="value">{loading ? '—' : templatesTotal}</div>
        </div>
        <div className="stat-card">
          <div className="label">Campañas recientes</div>
          <div className="value">{loading ? '—' : campaigns.length}</div>
        </div>
      </div>

      <div className="card">
        <h3>Últimas campañas</h3>
        {campaigns.length === 0 ? (
          <div className="empty">Aún no hay campañas. Crea una en la sección Campañas.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Campaña</th>
                  <th>Estado</th>
                  <th>Enviados</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c._id}>
                    <td>{c.nombre_campana}</td>
                    <td>
                      <Badge value={c.estado} />
                    </td>
                    <td>{c.metricas?.enviados ?? 0}</td>
                    <td>{c.metricas?.total ?? 0}</td>
                    <td>
                      <Link className="btn btn-sm" to={`/campaigns/${c._id}`}>
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
