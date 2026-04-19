package bdd

import (
	"database/sql"
	"fmt"

	_ "github.com/go-sql-driver/mysql"
)

const (
	driver = "mysql"
	host   = "localhost"
	port   = 3306
	user   = "root"
	pass   = ""
	dbname = "pa2026"
)

var Db *sql.DB

func NewDB() *sql.DB {
	sqlInfo := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?parseTime=true", user, pass, host, port, dbname)
	conn, err := sql.Open(driver, sqlInfo)
	if err != nil {
		panic(err.Error())
	}
	fmt.Println("Connexion à la bdd reussie")
	return conn
}
