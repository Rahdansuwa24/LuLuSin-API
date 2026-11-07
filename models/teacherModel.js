const { db } = require('../config/database/connection');
const bcrypt = require('bcryptjs');

class teacherModel {
    static async login(email) {
        try {
            const [rows] = await db.query("select * from teachers where email = ?", { replacements: [email] });
            if (rows.length == 0) {
                return null;
            }
            return rows[0];
        } catch (err) {
            throw err;
        }
    }

    static async getUsername(teacherId) {
        try {
            const [rows] = await db.query("select teacher_name from teachers where teacher_id = ?", { replacements: [teacherId] });
            return rows;
        } catch (err) {
            throw err;
        }
    }

    static async getAllTeachers() {
        try {
            const [rows] = await db.query("SELECT teacher_id, teacher_name, NUPTK, email FROM teachers");
            return rows;
        } catch (err) {
            throw err;
        }
    }

    static async store(data) {
        try {
            const defaultPassword = await bcrypt.hash('Lulusin123', 10);
            const [result] = await db.query(
                "INSERT INTO teachers (teacher_name, NUPTK, email, password) VALUES (?, ?, ?, ?)",
                { replacements: [data.teacher_name, data.NUPTK, data.email, defaultPassword] }
            );
            return result;
        } catch (err) {
            throw err;
        }
    }

    static async updateTeacher(teacherId, data) {
        try {
            const hashedPassword = (data.password && data.password.startsWith('$2'))
                ? data.password
                : await bcrypt.hash(data.password, 10);

            const [result] = await db.query(
                `UPDATE teachers SET teacher_name = ?, NUPTK = ?, email = ?, password = ? WHERE teacher_id = ?`,
                { replacements: [data.teacher_name, data.NUPTK, data.email, hashedPassword, teacherId] }
            );
            return result;
        } catch (err) {
            throw err;
        }
    }

    static async deleteTeacher(teacherId) {
        try {
            const [result] = await db.query("DELETE FROM teachers WHERE teacher_id = ?", { replacements: [teacherId] });
            return result;
        } catch (err) {
            throw err;
        }
    }
}

module.exports = teacherModel;
