# Use the official MongoDB image as a base
FROM mongo:6.0.19

ENV MONGO_INITDB_ROOT_USERNAME=root
ENV MONGO_INITDB_ROOT_PASSWORD=password
ENV MONGO_INITDB_DATABASE=print-prank

EXPOSE 27017


CMD ["mongod"]
