#!/bin/sh
# Reemplaza la variable ${BACKEND_URL} en la plantilla de Nginx
# con el valor real inyectado por Render en tiempo de ejecución
set -e

# Si BACKEND_URL no fue inyectada o está vacía, usamos el fallback por defecto
if [ -z "$BACKEND_URL" ]; then
  export BACKEND_URL="https://cocina-compartida-api.onrender.com"
fi

# Eliminar barra diagonal final si existe
export BACKEND_URL="${BACKEND_URL%/}"

export BACKEND_HOST=$(echo "$BACKEND_URL" | awk -F/ '{print $3}')

# Extraer el DNS interno del sistema para que Nginx pueda resolver hosts dinámicamente
export NAMESERVER=$(awk '/^nameserver/ {print $2; exit}' /etc/resolv.conf)
if [ -z "$NAMESERVER" ]; then
  export NAMESERVER="8.8.8.8"
fi

envsubst '${BACKEND_URL} ${BACKEND_HOST} ${NAMESERVER}' < /etc/nginx/conf.d/default.conf.template \
  > /etc/nginx/conf.d/default.conf

echo "Nginx configurado con BACKEND_URL=$BACKEND_URL, BACKEND_HOST=$BACKEND_HOST y NAMESERVER=$NAMESERVER"

exec nginx -g 'daemon off;'
