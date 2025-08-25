FROM ruby:2.7

RUN apt-get update -qq && apt-get install -y build-essential libpq-dev nodejs

WORKDIR /srv/jekyll

COPY . /srv/jekyll

RUN gem install bundler:1.16.0
RUN bundle install

EXPOSE 4000

CMD ["bundle", "exec", "jekyll", "serve", "--watch", "--force_polling", "--livereload", "--host", "0.0.0.0", "--port", "4000", "--incremental"] 