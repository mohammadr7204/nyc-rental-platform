#!/bin/bash

# NYC Rental Platform - Production Deployment Script
# This script automates the deployment process for the production environment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
BACKUP_DIR="./backups"
LOG_FILE="./logs/deployment.log"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}" | tee -a "$LOG_FILE"
}

show_help() {
    cat << EOF
NYC Rental Platform - Production Deployment Script

USAGE:
    $0 [COMMAND] [OPTIONS]

COMMANDS:
    deploy          Full production deployment
    update          Update existing deployment
    backup          Create database backup
    restore         Restore from backup
    health          Check system health
    logs            Show service logs
    stop            Stop all services
    restart         Restart all services
    ssl             Setup/renew SSL certificates
    monitor         Setup monitoring stack
    cleanup         Clean up old images and containers

OPTIONS:
    -f, --force     Force deployment without confirmations
    -b, --backup    Create backup before deployment
    -v, --verbose   Verbose output
    -h, --help      Show this help message

EXAMPLES:
    $0 deploy --backup          # Deploy with automatic backup
    $0 update --force           # Force update without confirmations
    $0 backup                   # Create manual backup
    $0 health                   # Check system health
    $0 logs backend             # Show backend logs

EOF
}

check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker is not running. Please start Docker service."
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if environment file exists
    if [[ ! -f "$ENV_FILE" ]]; then
        log_error "Environment file $ENV_FILE not found. Please copy .env.production.example to $ENV_FILE and configure it."
        exit 1
    fi
    
    # Check if compose file exists
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        log_error "Docker Compose file $COMPOSE_FILE not found."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

check_env_variables() {
    log "Checking required environment variables..."
    
    source "$ENV_FILE"
    
    required_vars=(
        "DATABASE_URL"
        "REDIS_URL"
        "JWT_SECRET"
        "STRIPE_SECRET_KEY"
        "AWS_ACCESS_KEY_ID"
        "AWS_SECRET_ACCESS_KEY"
        "ACME_EMAIL"
    )
    
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            log_error "  - $var"
        done
        exit 1
    fi
    
    log_success "Environment variables check passed"
}

create_directories() {
    log "Creating necessary directories..."
    
    directories=(
        "logs"
        "backups"
        "monitoring"
        "ssl"
        "data/postgres"
        "data/redis"
        "data/grafana"
        "data/prometheus"
    )
    
    for dir in "${directories[@]}"; do
        mkdir -p "$dir"
        log "Created directory: $dir"
    done
    
    log_success "Directories created"
}

backup_database() {
    log "Creating database backup..."
    
    # Create backup directory with timestamp
    backup_timestamp=$(date +"%Y%m%d_%H%M%S")
    backup_dir="$BACKUP_DIR/$backup_timestamp"
    mkdir -p "$backup_dir"
    
    # Check if database container is running
    if docker-compose -f "$COMPOSE_FILE" ps postgres | grep -q "Up"; then
        log "Database is running, creating backup..."
        
        # Create database dump
        docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_dump \
            -U "${POSTGRES_USER}" \
            -d "${POSTGRES_DB}" \
            --clean --if-exists --create \
            > "$backup_dir/database_backup.sql"
        
        # Compress backup
        gzip "$backup_dir/database_backup.sql"
        
        # Create backup metadata
        cat > "$backup_dir/backup_info.txt" << EOF
Backup Created: $(date)
Database: ${POSTGRES_DB}
User: ${POSTGRES_USER}
Platform Version: $(git rev-parse HEAD 2>/dev/null || echo "unknown")
EOF
        
        log_success "Database backup created: $backup_dir"
    else
        log_warning "Database container is not running, skipping backup"
    fi
}

restore_database() {
    if [[ -z "$1" ]]; then
        log_error "Please specify backup directory to restore from"
        log "Usage: $0 restore <backup_directory>"
        exit 1
    fi
    
    backup_path="$BACKUP_DIR/$1"
    
    if [[ ! -d "$backup_path" ]]; then
        log_error "Backup directory not found: $backup_path"
        exit 1
    fi
    
    if [[ ! -f "$backup_path/database_backup.sql.gz" ]]; then
        log_error "Backup file not found: $backup_path/database_backup.sql.gz"
        exit 1
    fi
    
    log "Restoring database from backup: $backup_path"
    
    # Stop application containers
    docker-compose -f "$COMPOSE_FILE" stop frontend backend
    
    # Decompress and restore backup
    gunzip -c "$backup_path/database_backup.sql.gz" | \
    docker-compose -f "$COMPOSE_FILE" exec -T postgres psql \
        -U "${POSTGRES_USER}" \
        -d "${POSTGRES_DB}"
    
    log_success "Database restored successfully"
}

build_images() {
    log "Building Docker images..."
    
    # Build with no cache for production
    docker-compose -f "$COMPOSE_FILE" build --no-cache --parallel
    
    log_success "Docker images built successfully"
}

run_database_migrations() {
    log "Running database migrations..."
    
    # Wait for database to be ready
    log "Waiting for database to be ready..."
    docker-compose -f "$COMPOSE_FILE" exec backend bash -c "
        until pg_isready -h postgres -p 5432 -U ${POSTGRES_USER}; do
            echo 'Waiting for database...'
            sleep 2
        done
        echo 'Database is ready!'
    "
    
    # Run migrations
    docker-compose -f "$COMPOSE_FILE" exec backend npm run db:migrate
    
    log_success "Database migrations completed"
}

setup_ssl() {
    log "Setting up SSL certificates..."
    
    # Create initial certificates directory
    mkdir -p ssl/letsencrypt
    
    # Start Traefik to generate certificates
    docker-compose -f "$COMPOSE_FILE" up -d traefik
    
    # Wait for certificate generation
    log "Waiting for SSL certificate generation..."
    sleep 30
    
    log_success "SSL setup completed"
}

deploy_services() {
    log "Deploying services..."
    
    # Deploy in stages for better startup
    log "Starting database services..."
    docker-compose -f "$COMPOSE_FILE" up -d postgres redis
    
    # Wait for databases to be ready
    sleep 10
    
    log "Starting application services..."
    docker-compose -f "$COMPOSE_FILE" up -d backend
    
    # Wait for backend to be ready
    sleep 15
    
    log "Starting frontend and proxy services..."
    docker-compose -f "$COMPOSE_FILE" up -d frontend traefik
    
    # Start monitoring services
    log "Starting monitoring services..."
    docker-compose -f "$COMPOSE_FILE" up -d prometheus grafana loki promtail node-exporter cadvisor
    
    # Start backup service
    docker-compose -f "$COMPOSE_FILE" up -d postgres-backup
    
    log_success "All services deployed successfully"
}

check_health() {
    log "Checking system health..."
    
    # Check if all containers are running
    failed_services=()
    
    services=(
        "postgres"
        "redis"
        "backend"
        "frontend"
        "traefik"
        "prometheus"
        "grafana"
    )
    
    for service in "${services[@]}"; do
        if ! docker-compose -f "$COMPOSE_FILE" ps "$service" | grep -q "Up"; then
            failed_services+=("$service")
        fi
    done
    
    if [[ ${#failed_services[@]} -gt 0 ]]; then
        log_error "The following services are not running:"
        for service in "${failed_services[@]}"; do
            log_error "  - $service"
        done
        return 1
    fi
    
    # Check application health endpoints
    log "Checking application health endpoints..."
    
    # Wait for services to be fully ready
    sleep 10
    
    # Check backend health
    if curl -f -s "http://localhost:8000/health" > /dev/null; then
        log_success "Backend health check passed"
    else
        log_error "Backend health check failed"
        return 1
    fi
    
    # Check frontend accessibility
    if curl -f -s "http://localhost:3000" > /dev/null; then
        log_success "Frontend accessibility check passed"
    else
        log_warning "Frontend accessibility check failed (may be normal if SSL redirect is active)"
    fi
    
    log_success "System health check completed successfully"
}

show_logs() {
    service="$1"
    
    if [[ -n "$service" ]]; then
        log "Showing logs for service: $service"
        docker-compose -f "$COMPOSE_FILE" logs -f --tail=100 "$service"
    else
        log "Showing logs for all services"
        docker-compose -f "$COMPOSE_FILE" logs -f --tail=50
    fi
}

cleanup() {
    log "Cleaning up old Docker images and containers..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused containers
    docker container prune -f
    
    # Remove unused volumes (be careful with this)
    # docker volume prune -f
    
    # Remove unused networks
    docker network prune -f
    
    log_success "Cleanup completed"
}

stop_services() {
    log "Stopping all services..."
    docker-compose -f "$COMPOSE_FILE" down
    log_success "All services stopped"
}

restart_services() {
    log "Restarting all services..."
    docker-compose -f "$COMPOSE_FILE" restart
    log_success "All services restarted"
}

main() {
    # Parse command line arguments
    COMMAND=""
    FORCE=false
    BACKUP=false
    VERBOSE=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            deploy|update|backup|restore|health|logs|stop|restart|ssl|monitor|cleanup)
                COMMAND="$1"
                shift
                ;;
            -f|--force)
                FORCE=true
                shift
                ;;
            -b|--backup)
                BACKUP=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                set -x
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                if [[ -z "$COMMAND" ]]; then
                    COMMAND="$1"
                fi
                shift
                ;;
        esac
    done
    
    # Default to deploy if no command specified
    if [[ -z "$COMMAND" ]]; then
        COMMAND="deploy"
    fi
    
    # Create log file
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    
    log "Starting NYC Rental Platform deployment script"
    log "Command: $COMMAND"
    log "Working directory: $PROJECT_DIR"
    
    cd "$PROJECT_DIR"
    
    case "$COMMAND" in
        deploy)
            check_prerequisites
            check_env_variables
            create_directories
            
            if [[ "$BACKUP" == true ]]; then
                backup_database
            fi
            
            if [[ "$FORCE" == false ]]; then
                echo -n "Are you sure you want to deploy to production? (y/N): "
                read -r response
                if [[ ! "$response" =~ ^[Yy]$ ]]; then
                    log "Deployment cancelled by user"
                    exit 0
                fi
            fi
            
            build_images
            deploy_services
            run_database_migrations
            check_health
            
            log_success "Production deployment completed successfully!"
            log "Frontend: https://yourdomain.com"
            log "API: https://api.yourdomain.com"
            log "Grafana: https://grafana.yourdomain.com"
            ;;
            
        update)
            check_prerequisites
            
            if [[ "$BACKUP" == true ]]; then
                backup_database
            fi
            
            if [[ "$FORCE" == false ]]; then
                echo -n "Are you sure you want to update the production deployment? (y/N): "
                read -r response
                if [[ ! "$response" =~ ^[Yy]$ ]]; then
                    log "Update cancelled by user"
                    exit 0
                fi
            fi
            
            build_images
            docker-compose -f "$COMPOSE_FILE" up -d
            check_health
            log_success "Production update completed successfully!"
            ;;
            
        backup)
            backup_database
            ;;
            
        restore)
            restore_database "$2"
            ;;
            
        health)
            check_health
            ;;
            
        logs)
            show_logs "$2"
            ;;
            
        stop)
            stop_services
            ;;
            
        restart)
            restart_services
            check_health
            ;;
            
        ssl)
            setup_ssl
            ;;
            
        monitor)
            docker-compose -f "$COMPOSE_FILE" up -d prometheus grafana loki promtail
            log_success "Monitoring services started"
            ;;
            
        cleanup)
            cleanup
            ;;
            
        *)
            log_error "Unknown command: $COMMAND"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"