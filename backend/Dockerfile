FROM php:8.2-apache

RUN docker-php-ext-install pdo pdo_mysql mysqli

RUN a2enmod rewrite headers

RUN echo "ServerName localhost" >> /etc/apache2/apache2.conf

COPY apache.conf /etc/apache2/sites-available/000-default.conf

# Copy all PHP source into the image
COPY public/ /var/www/html/public/
COPY src/     /var/www/html/src/

EXPOSE 80
