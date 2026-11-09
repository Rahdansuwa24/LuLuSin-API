const { db } = require('../config/database/connection')

class subjectModel {
    static async getall() {
        try {
            const [rows] = await db.query("select s.*, sc.subject_category_name from subjects s left join subject_categories sc on s.id_subject_category = sc.subject_category_id")
            return rows
        } catch (err){
            throw err
        }
    } 

    static async store(data) {
        try {
            const [result] = await db.query("insert into subjects set id_subject_category = ?, subject_name = ?, time_limit = ?, minimal_questions = ?", { replacements: [data.id_subject_category, data.subject_name, data.time_limit, data.minimal_questions] })
            return result
        } catch (err) {
            throw err
        }
    }   

    static async update(id, data) {
        try {
            const [result] = await db.query("update subjects set id_subject_category = ?, subject_name = ?, time_limit = ?, minimal_questions = ? where subject_id = ?", { replacements: [data.id_subject_category, data.subject_name, data.time_limit, data.minimal_questions, id] })
            return result
        } catch (err) {
            throw err
        }
    }

    static async delete(id) {
        try {
            const [result] = await db.query("delete from subjects where subject_id = ?", { replacements: [id] })
            return result
        } catch (err) {
            throw err
        }
    }

    static async SubjectJoinCattegory() {
        try {
            const [result] = await db.query("select subjects.subject_name, subjects.time_limit, subjects.minimal_questions, subject_categories.subject_category_name from subjects left join subject_categories on subjects.id_subject_category = subject_categories.subject_category_id")
            return result
        } catch (err) {
            throw err
        }
    }

    static async getTotalQuestionAndTotalTime(idTryout = null) {
        try {
            const [result] = await db.query(
                `SELECT SUM(minimal_questions) AS total_minimal_questions, SUM(time_limit) AS total_time_limit FROM subjects`)
            const data = { ...result[0] }

            let isStandard = false
            if (idTryout) {
                const [tRows] = await db.query("SELECT exam_mode FROM tryouts WHERE tryout_id = ?", { replacements: [idTryout] })
                if (tRows[0] && tRows[0].exam_mode === 'standard') {
                    isStandard = true
                }
            } else if (process.env.EXAM_MODE === 'standard') {
                isStandard = true
            }

            if (isStandard) {
                data.total_time_limit = 195
            }

            return data
        } catch (err) {
            throw err
        }
    }
    
    static async getSubjectAndCB(idSubject) {
        try {
            const [result] = await db.query("SELECT sc.subject_category_name AS kategori, s.subject_id, s.subject_name AS subjek FROM subjects AS s JOIN subject_categories AS sc ON s.id_subject_category = sc.subject_category_id WHERE s.subject_id = ?", { replacements: [idSubject]})
            return result
        } catch (err) {
            throw err
        }
    }
}

module.exports = subjectModel
